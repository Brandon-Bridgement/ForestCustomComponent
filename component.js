import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
export default class MyGraphComponent extends Component {
  @service lianaSession;

  @tracked authToken;

  @tracked isDataLoaded = false;


  constructor() {
    super(...arguments);
    this.authToken = this.lianaSession.authToken;
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
  async didInsertElement(element) {
    try {
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js"
      );
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js"
      );
      // await this.loadScript(
      //   "https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/worker.min.js"
      // );
      console.log("Scripts loaded")
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

@action
async loadGraphData(retryCount = 0) {
  console.log(`auth token is ${this.authToken}`);

  // Check if authToken is available
  if (this.authToken === undefined) {
    if (retryCount < 3) { // Retry up to 3 times
      console.log("Retrying to fetch graph data...");
      console.log("Trying to re render")
      this.isDataLoaded = true
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 1 second before retrying
      return this.loadGraphData(retryCount + 1);
    } else {
      console.error("Failed to fetch graph data: auth token not available");
      return null;
    }
  }

  // Proceed with fetching data
  try {
    const response = await fetch("http://localhost:3000/api/neo4j-graph/userGraph", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if(data){
      this.initializeGraph(this.element, data);
    }
  } catch (error) {
    console.error("Error fetching graph data:", error);
    return null;
  }
}


  @action
  initializeGraph(element, data) {
    const Graph = window.graphology;
    const Sigma = window.Sigma;
    console.log("Graph data:", data);

    if (!Graph || !Sigma) {
      console.error("Graphology or Sigma libraries are not loaded");
      return;
    }

    let graph = new Graph();
    // Add nodes and edges from the data
    // For example:
    // data.nodes.forEach((node) => {
    //   graph.addNode(node.id, {
    //     x: node.x,
    //     y: node.y,
    //     size: node.size,
    //     label: node.label,
    //     color: node.color,
    //   });
    // });

    // data.edges.forEach((edge) => {
    //   graph.addEdge(edge.source, edge.target);
    // });
    graph.addNode("John", {
      x: 0,
      y: 10,
      size: 5,
      label: "John",
      color: "blue",
    });
    graph.addNode("Mary", {
      x: 10,
      y: 0,
      size: 3,
      label: "Mary",
      color: "red",
    });
    graph.addEdge("John", "Mary");

    const div = document.createElement("div");
    div.className = "sigma-container";
    div.style.height = "500px";
    div.style.width = "100%";
    div.style.border = "2px solid #333";
    div.style["border-radius"] = "10px";

    if (!element) {
      console.error("Element is not available for appending the graph");
      return;
    }
    element.appendChild(div);

    new Sigma(graph, div);
  }
}