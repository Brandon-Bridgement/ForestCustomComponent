import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class MyGraphComponent extends Component {
  @service lianaSession;

  @tracked authToken;
  @tracked isDataLoaded = false;
  @tracked graphData = null;

  constructor() {
    super(...arguments);
    this.initializeAuthToken();
  }

  async initializeAuthToken() {
    while (!this.lianaSession.authToken) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100 ms
    }
    this.authToken = this.lianaSession.authToken;
    this.loadGraphData();
  }

  async loadScript(url) {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = "text/javascript";
      script.onload = resolve;
      script.onerror = reject;
      script.src = url;
      document.head.appendChild(script);
    });
  }

  @action
  async didInsertElement() {
    try {
      await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js");
      await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js");
      console.log("Scripts loaded");
      if (this.graphData) {
        this.initializeGraph(this.graphData);
      }
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

  @action
  async loadGraphData(retryCount = 0) {
    console.log(`auth token is ${this.authToken}`);

    if (!this.authToken) {
      if (retryCount < 3) {
        console.log("Retrying to fetch graph data...");
        this.isDataLoaded = false;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.loadGraphData(retryCount + 1);
      } else {
        console.error("Failed to fetch graph data: auth token not available");
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:3000/api/neo4j-graph/userGraph", {
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
      if (this.graphData && this.isElementAvailable) {
        this.initializeGraph(this.graphData);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  @action
  initializeGraph(data) {
    const element = this.element;
    console.log("Initializing graph", element)

    if (!element) {
      console.error("Element is not available for appending the graph");
      return;
    }

    const Graph = window.graphology;
    const Sigma = window.Sigma;

    if (!Graph || !Sigma) {
      console.error("Graphology or Sigma libraries are not loaded");
      return;
    }

    let graph = new Graph();
    // Test nodes and edges
    graph.addNode("John", { x: 0, y: 0, size: 3, label: "John", color: "blue" });
    graph.addNode("Mary", { x: 1, y: 1, size: 3, label: "Mary", color: "red" });
    graph.addEdge("John", "Mary");

    // Add nodes and edges from the data if available
    // Example: 
    // data.nodes.forEach(node => graph.addNode(node.id, { ...node }));
    // data.edges.forEach(edge => graph.addEdge(edge.source, edge.target, { ...edge }));

    const div = document.createElement("div");
    div.className = "sigma-container";
    div.style.cssText = "height: 500px; width: 100%; border: 2px solid #FF0000; border-radius: 10px;";
    div.textContent = "Graph Container"; // Temporary content


    element.appendChild(div);

    new Sigma(graph, div);
  }

  get isElementAvailable() {
    return !!this.element;
  }
}
