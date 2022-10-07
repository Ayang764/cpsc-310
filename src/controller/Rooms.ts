import parse5 = require ("parse5");
import JSZip = require("jszip");
import {GeoResponse, Room} from "./Interfaces";
import {GeoLocation} from "./GeoLocation";


export default class RoomClass extends GeoLocation {
	public listRooms = [] as Room[];

	private makeRooms(zip: JSZip) {
		return new Promise<Room[]>((resolve, reject) => {
			let roomPromiseArray = [];
			if (this.building !== {}) {
				roomPromiseArray.push(this.getRooms(zip));
				// let promise = getRooms(zip);
				// roomPromiseArray.push(promise);
			}
			Promise.all(roomPromiseArray).then(() => {
				// this contains full list of rooms
				resolve(this.listRooms);
				// console.log(this.listRooms);
				// console.log("final");
			});
		});
	}

	private async getRooms(zip: JSZip) {
		return new Promise((resolve, reject) => {
			let promiseArray: any = [];
			let roomKey = "rooms/campus/discover/buildings-and-classrooms";
			let folder = zip.folder(roomKey);
			if(folder != null) {
				folder.forEach((relativePath: any, file: any) => {
					if(this.building[relativePath] != null) {
						promiseArray.push(file.async("string")
							.then((content: string) => {
								this.parseRoom(this.building[relativePath], parse5.parse(content));
							}));
					}
				});
			}
			Promise.all(promiseArray).then(() => {
				resolve(100);
			});
		});
	}

	private async getRoomHelper(room: Room, file: any) {
		let promise = file.async("string").then((content: string) => {
			this.parseRoom(room, parse5.parse(content));
		});
		Promise.all([promise]).then(() => {
			return;
		});
	}

	private parseRoom(room: Room, content: parse5.Document) {
		// console.log("ran parseShortName(...)")
		for (let element of content.childNodes) {
			if(element.nodeName === "html") {
				return this.parseRoomHelper(room, element);
			}
		}
	}

	private parseRoomHelper(room: Room, node: parse5.Element) {
		if (node == null) {
			return new Error();
		}
		for (let element of node.childNodes) {
			switch(element.nodeName) {
				case "tbody": this.createRooms(room, element);
				case "body":
				case "div":
				case "table":
				case "section": {
					this.parseRoomHelper(room, element);
					break;
				}
			}
		}
	}

	private createRooms(room: Room, node: parse5.Element) {
		for (let tr of node.childNodes) {
			if (tr.nodeName === "tr") {
				this.addRooms(room, tr as parse5.Element);
			}
		}
	}

	private addRooms(room: Room, node: parse5.Element) {
		let currentRoom = Object.assign({}, room);
		// default seats is 0, will be changed if the room contains capacity field
		currentRoom.seats = 0;
		let number = "views-field views-field-field-room-number";
		let capacity = "views-field views-field-field-room-capacity";
		let furniture = "views-field views-field-field-room-furniture";
		let type = "views-field views-field-field-room-type";

		for (let td of node.childNodes) {
			if (td.nodeName === "td") {
				switch(td.attrs[0]["value"]){
					case(number): {
						let nameAndHref = this.getRoomNameAndHREF(td);
						currentRoom.name = currentRoom.shortname + "_" + nameAndHref["name"];
						currentRoom.number = nameAndHref["name"];
						currentRoom.href = nameAndHref["href"];
						break;
					}
					case(capacity): {
						let seats = Number(this.getModifiedText(td));
						if (seats !== undefined) {
							currentRoom.seats = seats;
						}
						break;
					}
					case(furniture): {
						let currFurniture = this.getModifiedText(td);
						if (currFurniture !== undefined) {
							currentRoom.furniture = currFurniture;
						}
						break;
					}
					case(type): {
						let currType = this.getModifiedText(td);
						if (currType !== undefined) {
							currentRoom.type = currType;
						}
						break;
					}
				}
			}
		}

		this.listRooms.push(currentRoom);
	}

	private getRoomNameAndHREF(td: parse5.Element) {
		let nameAndHref = {
			name: "",
			href: ""
		};
		for (let child of td.childNodes) {
			if (child.nodeName === "a") {
				let roomName = this.getRoomNameHelper(child);
				if(roomName !== undefined) {
					nameAndHref["name"] = roomName;
				}
				nameAndHref["href"] = child.attrs[0].value;
			}
		}
		return nameAndHref;
	}

	private getRoomNameHelper(aNode: parse5.Element) {
		for (let text of aNode.childNodes) {
			if (text.nodeName === "#text") {
				return (text as parse5.TextNode).value;
			}
		}
	}

	public getBuildingNames(zip: JSZip) {
		return new Promise<Room[]>((resolve, reject) => {
			let indexKey = "rooms/index.htm";
			let promise: any;
			let file = zip.file((indexKey));
			if (file != null) {
				promise = file.async("string").then((content) => {
					this.parseBuilding(parse5.parse(content));
				}).catch((err) => {
					reject(err);
				});
			}

			Promise.all([promise]).then(() => {
				this.getGeoInfo().then(() => {
					resolve(this.makeRooms(zip));
				}).catch((err) => {
					reject(err);
				});
			});
		});
	}
}
