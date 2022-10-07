import RoomClassHelper from "./RoomHelper";
import {GeoResponse, Room} from "./Interfaces";
import http = require("http");

export class GeoLocation extends RoomClassHelper {

	protected getGeoInfo() {
		return new Promise((resolve, reject) => {
			let link = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team189/";
			let promiseArray: any = [];
			for (let shortName in this.building) {
				let element = this.building[shortName];
				let address = encodeURIComponent(element.address);
				let targetLink = link + address;
				let geoResult = {} as GeoResponse;
				promiseArray.push(this.extractGeoFromHTTP(targetLink, geoResult, element));
			}

			Promise.all(promiseArray).then(() => {
				resolve(1);
			}).catch((err) => {
				reject(err);
			});
		});
	}

	private extractGeoFromHTTP(targetLink: string, geoResult: GeoResponse, element: Room) {
		return new Promise((resolve, reject) => {
			http.get(targetLink, (res) => {
				res.on("data", (chunk: any) => {
					geoResult = JSON.parse(chunk);
					let addLatLon = this.getLatAndLon(geoResult, element);
					if (addLatLon === undefined) {
						reject("Bad URI");
					}
					if (addLatLon === "valid") {
						resolve(1);
					} else if(addLatLon === geoResult.error) {
						resolve(addLatLon);

					}
				});
			});
		});
	}

	private getLatAndLon(geoResult: GeoResponse, element: Room) {
		if (geoResult.lat === undefined || geoResult.lon === undefined) {
			return geoResult.error;
		} else {
			element.lat = geoResult.lat;
			element.lon = geoResult.lon;
		}
		this.building[element.shortname] = element;
		return "valid";
	}
}
