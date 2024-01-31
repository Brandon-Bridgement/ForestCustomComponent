import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class MyGraphComponent extends Component {
  @service lianaSession;

  @tracked authToken;
  @tracked graphData = null;
  @tracked scriptsLoaded = false;
  @tracked element; // Track the element to render the graph in

  constructor() {
    super(...arguments);
    this.loadScripts();
  }

  async loadScripts() {
    console.log("Starting to load scripts");
    try {
      await Promise.all([
        this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js"),
        this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js")
      ]);
      console.log("Scripts loaded successfully");
      this.scriptsLoaded = true;

      if (this.element) {
        this.initializeGraph();
      }
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

  async loadScript(url) {
    console.log("Loading script:", url);
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = "text/javascript";
      script.onload = () => resolve(console.log(`Script loaded successfully: ${url}`));
      script.onerror = () => reject(console.error(`Error loading script: ${url}`));
      script.src = url;
      document.head.appendChild(script);
    });
  }

  @action
  async initializeGraph() {
    console.log("initializeGraph action triggered");

    if (!this.scriptsLoaded) {
      console.log("Scripts are not loaded yet.");
      return;
    }

    if (!this.authToken || !this.graphData) {
      await this.fetchAuthTokenAndGraphData();
    }

    if (!this.graphData) {
      console.error("No graph data to initialize");
      return;
    }

    this.createGraph(this.element);
  }

  @action
  didInsertElement(element) {
    console.log("Element inserted");
    this.element = element;
    if (this.scriptsLoaded) {
      this.initializeGraph();
    }
  }

  async fetchAuthTokenAndGraphData() {
    await this.fetchAuthToken();
    await this.loadGraphData();
  }

  async fetchAuthToken() {
    while (!this.lianaSession.authToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.authToken = this.lianaSession.authToken;
    console.log("AuthToken acquired:", this.authToken);
  }

  async loadGraphData() {
    const url = "http://localhost:3000/api/neo4j-graph/userGraph";
    console.log("Fetching graph data from:", url);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.graphData = await response.json();
      console.log("Graph data successfully loaded:", this.graphData);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  createGraph(element) {
    const Graph = window.graphology;
    const Sigma = window.Sigma;

    let graph = new Graph();
    this.graphData.nodes.forEach(node => {
      graph.addNode(node.id, {
        x: Math.random() * 100, // Random X coordinate
        y: Math.random() * 100, // Random Y coordinate
        label: node.properties.Id || node.properties.Email,
        size: 15,
        color: node.label === 'DEVICE' ? "#FA4F40" : node.label === 'USER' ? "#4F9FFA" : "#4FFA4F",
      });
    });
    this.graphData.edges.forEach(edge => {
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.label || "",
        size: 3,
      });
    });

    new Sigma(graph, element);
    console.log("Graph initialized and rendered");
  }
}
