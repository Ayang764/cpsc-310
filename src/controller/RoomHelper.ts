import {Building, Room} from "./Interfaces";
import parse5 from "parse5";

export default class BuildingClass {
	protected building = {} as Building;

	protected getModifiedText(td: parse5.Element) {
		for (let child of td.childNodes) {
			if (child.nodeName === "#text") {
				let text = (child as parse5.TextNode).value.replace("\n", "").trim();
				return text;
			}
		}
	}

	protected parseBuilding(content: parse5.Document) {
		// console.log("ran parseShortName(...)")
		for (let element of content.childNodes) {
			if (element.nodeName === "html") {
				this.parseBuildingHelper(element);
			}
		}
	}

	private parseBuildingHelper(content: parse5.Element) {
		// console.log("ran parseShortNameHelper(...) on ", content.nodeName)
		if (content == null) {
			return;
		}
		for (let element of content.childNodes) {
			switch (element.nodeName) {
				case "tbody":
					this.createBuildings(element);
				case "body":
				case "div":
				case "table":
				case "section": {
					this.parseBuildingHelper(element);
					break;
				}
			}
		}
	}

	private createBuildings(node: parse5.Element) {
		for (let tr of node.childNodes) {
			if (tr.nodeName === "tr") {
				this.addBuilding(tr as parse5.Element);
			}
		}
	}

	private addBuilding(node: parse5.Element) {
		let element = {} as Room;
		for (let td of node.childNodes) {
			if (td.nodeName === "td") {
				if (td.attrs[0]["value"] === "views-field views-field-field-building-code") {
					element.shortname = this.getModifiedText(td) as string;
				} else if (td.attrs[0]["value"] === "views-field views-field-title") {
					element.fullname = this.getLongName(td) as string;
				} else if (td.attrs[0]["value"] === "views-field views-field-field-building-address") {
					element.address = this.getModifiedText(td) as string;
				}
			}
		}

		if (element.shortname != null) {
			this.building[element.shortname] = element;
		}
	}

	private getLongName(node: parse5.Element) {
		for (let a of node.childNodes) {
			if (a.nodeName === "a") {
				return this.getLongNameHelper(a);
			}
		}
	}

	private getLongNameHelper(node: parse5.Element) {
		if (node.attrs[1]["value"] === "Building Details and Map") {
			for (let t of node.childNodes) {
				if (t.nodeName === "#text") {
					let text = (t as parse5.TextNode).value;
					return text;
				}
			}
		}
	}
}
