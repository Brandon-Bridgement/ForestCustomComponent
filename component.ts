import Component from "@glimmer/component";
import { action } from "@ember/object";

export default class MyGraphComponent extends Component {
  @action
  async loadScript(url) {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = "text/javascript";

      script.onload = () => {
        console.log(`Script loaded: ${url}`);
        resolve();
      };
      script.onerror = reject;
      script.src = url;

      document.head.appendChild(script);
    });
  }

  @action
  async didInsertElement() {
    try {
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/sigma.js/2.4.0/sigma.js"
      );
      console.log("Sigma.js script loaded successfully.");

      // Simplified logic to append a div
      const div = document.createElement("div");
      div.textContent = "Sigma.js Loaded";
      div.style.border = "2px solid blue";
      div.style.padding = "10px";
      div.style.marginTop = "10px";

      this.element.appendChild(div);
    } catch (error) {
      console.error("Error loading script:", error);
    }
  }
}
