import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
class Node {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
  }
}
class Edge {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }
}
export default class MyGraphComponent extends Component {
  @service lianaServerFetch;
  @tracked graphData = null;
  @tracked scriptsLoaded = false;
  @tracked element;
  @tracked searchParams = {};
  @tracked selectedNode = null;
  @tracked isLoading = false;
  @tracked nodeCounts = {};

  labelColors = {
    USER: '#4F9FFA',
    DEVICE: '#FA4F40',
  };

  constructor() {
    super(...arguments);
    this.loadScripts();
    this.parseUrlSearchParams();
  }
  parseUrlSearchParams() {
    const params = new URLSearchParams(window.location.search);
    const paramsObj = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });
    this.searchParams = paramsObj;
  }

  async loadScripts() {
    try {
      await Promise.all([
        this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js"),
        this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js"),
        this.loadScript("https://custom-forest-components-public.s3.eu-west-1.amazonaws.com/worker.js")
      ]);
      this.scriptsLoaded = true;

      if (this.element) {
        this.initializeGraph();
      }
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

  async loadScript(url) {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = "text/javascript";
      script.onload = () => resolve();
      script.onerror = () => reject(console.error(`Error loading script: ${url}`));
      script.src = url;
      document.head.appendChild(script);
    });
  }

  @action
  async initializeGraph() {
    if (!this.scriptsLoaded) {
      return;
    }
    if (!this.graphData) {
      await this.loadGraphData();
    }
    if (!this.graphData) {
      console.error("No graph data to initialize");
      return;
    }
    this.createGraph(this.element);
  }

  @action
  didInsertElement(element) {
    this.element = element;
    if (this.scriptsLoaded) {
      this.initializeGraph();
    }
  }

  async loadGraphData() {
    this.isLoading = true;
    const userId = this.searchParams.userId;
    if (userId) {
      try {
        const response = await this.lianaServerFetch.fetch(
          `/forest/_charts/DbUser/User%20Fraud%20Graph?record_id=${userId}`,
          {}
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const graphData = await response.json();
        this.graphData = graphData;
        const counts = graphData.nodes.reduce((acc, node) => {
          const label = node.label.toUpperCase();
          if (!acc[label]) {
            acc[label] = { count: 0, color: this.labelColors[label] || '#ccc' };
          }
          acc[label].count += 1;
          return acc;
        }, {});
        this.nodeCounts = counts;
      } catch (error) {
        console.error("Error fetching graph data:", error);
      } finally {
        this.isLoading = false;
      }
    } else {
      console.error("No user id found in the URL")
      this.isLoading = false
    }
  }

  createGraph(element) {
    const Graph = window.graphology;
    const Sigma = window.Sigma;
    let graph = new Graph();
    let graphNodes = [];
    let graphEdges = [];

    const nodeSpacing = 500;
    const fixedY = 300;
    this.graphData.nodes.forEach((node, index) => {
      let newNode = new Node(node.id, index * nodeSpacing, fixedY);
      graphNodes.push(newNode);
      graph.addNode(node.id, {
        x: newNode.x,
        y: newNode.y,
        label: node.properties.Id,
        size: 15,
        color: node.label === 'DEVICE' ? "#FA4F40" : node.label === 'USER' ? "#4F9FFA" : "#4FFA4F",
        properties: node.properties
      });
    });

    this.graphData.edges.forEach(edge => {
      let sourceNode = graphNodes.find(n => n.id === edge.source);
      let targetNode = graphNodes.find(n => n.id === edge.target);
      let newEdge = new Edge(sourceNode, targetNode);
      graphEdges.push(newEdge);
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.label,
        size: 3,
        type: "arrow"
      });
    });

    const sensibleSettings = inferSettings(graph);
    const positions = window.synchronousLayout(graph, {
      iterations: 100,
      settings: sensibleSettings
    });
    Object.keys(positions).forEach(nodeId => {
      const newPos = positions[nodeId];
      graph.mergeNodeAttributes(nodeId, {
        x: newPos.x,
        y: newPos.y
      });
    });
    const renderer = new Sigma(graph, element, {
      renderEdgeLabels: true,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 6
    });

    let draggedNode = null;
    let isDragging = false;

    renderer.on("downNode", (e) => {
      isDragging = true;
      draggedNode = e.node;
      graph.setNodeAttribute(draggedNode, "highlighted", true);
    });

    renderer.on("clickNode", (e) => {
      const nodeId = e.node;
      graph.forEachNode((node, attributes) => {
        if (attributes.highlighted) {
          graph.setNodeAttribute(node, "highlighted", false);
        }
      });
      const nodeAttributes = graph.getNodeAttributes(nodeId);
      if (!nodeAttributes.highlighted) {
        graph.setNodeAttribute(nodeId, "highlighted", true);
      } else {
        graph.setNodeAttribute(nodeId, "highlighted", false);
      }
      renderer.refresh();
      this.selectedNode = {
        label: nodeAttributes.label,
        properties: nodeAttributes.properties
      };
    });

    renderer.getMouseCaptor().on("mousemovebody", (e) => {
      if (!isDragging || !draggedNode) return;
      const pos = renderer.viewportToGraph(e);
      graph.setNodeAttribute(draggedNode, "x", pos.x);
      graph.setNodeAttribute(draggedNode, "y", pos.y);
      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });

    renderer.getMouseCaptor().on("mouseup", () => {
      if (draggedNode) {
        graph.removeNodeAttribute(draggedNode, "highlighted");
      }
      isDragging = false;
      draggedNode = null;
    });

    renderer.on("clickStage", () => {
      this.selectedNode = null;
    });

    const canvases = element.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      canvas.style.width = 'auto';
      canvas.style.maxWidth = 'none';
      canvas.style.height = 'auto';
    });
  }
}
