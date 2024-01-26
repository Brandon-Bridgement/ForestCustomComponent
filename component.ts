import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action, inject as service } from "@ember/service";
export default class MyGraphComponent extends Component {
  @service lianaSession;

  @tracked authToken = this.lianaSession.authToken;

  @action
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
    super.didInsertElement();

    try {
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js"
      );
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/graphology/0.25.4/graphology.umd.min.js"
      );
      await this.loadScript(
        "https://cdn.jsdelivr.net/npm/graphology-layout-forceatlas2@0.10.1/worker.min.js"
      );

      this.loadGraphData();
    } catch (error) {
      console.error("Error loading scripts:", error);
    }
  }

  @action
  loadGraphData() {
    console.log(`auth token is ${this.authToken}`);
    fetch("http://localhost:3000/api/neo4j-graph/userGraph", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("data: ", data);
        this.initializeGraph(data);
      });
  }

  @action
  initializeGraph(data) {
    const Graph = window.graphology;
    const Sigma = window.Sigma;

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

    this.element.appendChild(div);

    new Sigma(graph, div);
  }
}
