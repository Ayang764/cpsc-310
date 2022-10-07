import JSZip from "jszip";
import {InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {DatasetObject, Room, SingleCourse} from "./Interfaces";
import RoomClass from "./Rooms";


// object for store the dataset

export default class Dataset {
	// dataset for stored courses
	protected datasetList: DatasetObject[];
	protected roomObject: RoomClass;

	// constructor for Dataset object
	constructor() {
		this.datasetList = [] as DatasetObject[];
		this.roomObject = new RoomClass();
	}


	public getDatasetList(): DatasetObject[]{
		// console.log("ran getDatasetList");
		return this.datasetList;
	}

	public setDatasetList(list: DatasetObject[]) {
		this.datasetList = list;
	}

	/**
	 * parses the json file from readfilesync into DatasetObjects
	 * If the json file is derived from courses, the data will be stored in the course field
	 * If the json file is derived from rooms, the data will be stored in the rooms field
	 */
	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<DatasetObject[]> {
		console.log("ran Dataset::addDataset()");
		return new Promise<DatasetObject[]>((resolve, reject) => {
			if(this.checkId(id)) {
				console.log(id + " is invalid: throwing InsightError");
				reject(new InsightError("Invalid ID"));
			}
			for (let i of this.datasetList) {
				if (i.id === id) {
					console.log("Dataset ID Exists, rejecting with InsightError");
					reject(new InsightError("ID already exists"));
				}
			}
			if (kind === InsightDatasetKind.Rooms) {
				resolve(this.addRoomDataset(id, kind, content));
			} else if (kind === InsightDatasetKind.Courses){
				resolve(this.addCourseDataset(id, kind, content));
			}
		});
	}

	private newRoomObject() {
		this.roomObject = new RoomClass();
	}

	private initDataSetObject(id: string, kind: InsightDatasetKind) {
		let objectToAdd = {} as DatasetObject;
		objectToAdd.id = id;
		objectToAdd.kind = kind;
		return objectToAdd;
	}

	private addRoomDataset(id: string, kind: InsightDatasetKind, content: string) {
		return new Promise<DatasetObject[]> ((resolve, reject) => {
			let objectToAdd = this.initDataSetObject(id, kind);
			this.parseRoomDataset(content).then((result) => {
				objectToAdd.rooms = result;
				this.datasetList.push(objectToAdd);
				// console.log(objectToAdd);
				resolve(this.datasetList);
			}).catch((err) => {
				reject(new InsightError());
			});
		});
	}

	private parseRoomDataset(content: string): Promise<Room[]> {
		return new Promise((resolve, reject)=> {
			// converting zip file to base64 string
			// let data = fs.readFileSync(name).toString("base64");
			this.newRoomObject();
			// reading zip file
			JSZip.loadAsync(content, {base64: true})
				.then((zip) => {
					this.roomObject.getBuildingNames(zip).then((res) => {
						resolve(res);
					}).catch((err) => {
						reject(err);
					});
				});
		});
	}


	private addCourseDataset(id: string, kind: InsightDatasetKind, content: string) {
		return new Promise<DatasetObject[]>((resolve, reject) => {
			let objectToAdd = this.initDataSetObject(id, kind);
			this.parseCourseDataset(content).then((result) => {
				objectToAdd.courses = result;
				this.datasetList.push(objectToAdd);
				// console.log(objectToAdd);
				resolve(this.datasetList);
			}).catch((err) => {
				reject(new InsightError());
			});
		});
	}

	private checkId(id: string){
		return (id.includes(" ") || !id.trim() || id.includes("***")) || !/^[^_]+$/.test(id) || id.includes("_");
	}

	// parses zip data read from fs.readFileSync and convert it into a list of SingleCourses
	private async parseCourseDataset(content: string): Promise<SingleCourse[]> {
		return new Promise((resolve, reject)=> {
			// object which stores all the course info
			// let courseDatabase represent the database for where courses are stored

			// converting zip file to base64 string
			// let data = fs.readFileSync(name).toString("base64");

			// reading zip file
			JSZip.loadAsync(content, {base64:true}).then(function (result) {
				let folder = result.folder("courses");
				if (folder == null || folder === undefined) {
					reject (new InsightError("No Courses Folder"));
				} else {
					return folder;
				}
			}).then((folder) => {
				this.parseCourseFolder(folder).then((result) => {
					resolve(result);
				});
			}).catch(function (err: any) {
				reject(err);
			});
		});
	}

	// parses the files in the "courses" folder from the zip file and convert them into
	// a SingleCourse array.
	private async parseCourseFolder(folder: any): Promise<SingleCourse[]> {
		return new Promise<SingleCourse[]>((resolve, reject) => {
			let courseDatabase = [] as SingleCourse[];
			let promiseArray: any[] = [];
			folder = (folder as JSZip);
			folder.forEach(async function (relativePath: any, file: { async: (arg0: string) => Promise<any>; }){
				promiseArray.push(file.async("string").then(function(res) {
					let obj = JSON.parse(res);
						// console.log(obj["result"]);
						// let m_course = {} as main_course
						// m_course.course_name = relativePath;
						// m_course.course_data = [] as SingleCourse[];
					for (let i of obj["result"]) {
						let toAdd = {} as SingleCourse;
						toAdd.dept = i["Subject"];
						toAdd.id = i["Course"];
						toAdd.avg = i["Avg"];
						toAdd.instructor = i["Professor"];
						toAdd.title = i["Title"];
						toAdd.pass = i["Pass"];
						toAdd.fail = i["Fail"];
						toAdd.audit = i["Audit"];
						toAdd.uuid = i["id"].toString();
						if (i["Section"] === "overall"){
							toAdd.year = 1900;
						} else {
							toAdd.year = Number(i["Year"]);
						}
						courseDatabase.push(toAdd);
					}
				})


				);
			});
			// console.log(courseDatabase.length)
			Promise.all(promiseArray).then(function () {
				// console.log(courseDatabase);
				resolve(courseDatabase);
			});
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string> ((resolve, reject)=> {
			if(this.checkId(id)) {
				reject(new InsightError("invalid ID"));
			}

			for (let i in this.datasetList) {
				if (this.datasetList[i].id === id) {
					// console.log(this.datasetList);
					this.datasetList.splice(Number(i), 1);
					// console.log(this.datasetList);
					resolve(id);
				}
			}
			reject(new NotFoundError("dataset ID not found"));
		});
	}

	/**
	 * @params: takes in 2 valid building codes (3-4 characters long, only contains alphabet characters)
	 * @param first: first building code
	 * @param second: second building code
	 * returns the distance between the two buildings
	 */
	public getDistances(first: string, second: string) {
		return new Promise<number>((resolve, reject) => {
			first = first.toUpperCase();
			second = second.toUpperCase();
			if(this.checkShortName(first) && this.checkShortName(second)) {
				reject("Incorrect building code(s)");
			}
			let firstCoord: {"lat": number, "lon": number} = {
				lat: 0,
				lon: 0
			};
			let secondCoord: {"lat": number, "lon": number} = {
				lat: 0,
				lon: 0
			};
			for (let dataset of this.datasetList) {
				if (dataset.kind === InsightDatasetKind.Rooms && dataset.rooms.length > 0) {
					for (let room of dataset.rooms) {
						if (room.shortname === first) {
							firstCoord.lat = room.lat;
							firstCoord.lon = room.lon;
						}
						if (room.shortname === second) {
							secondCoord.lat = room.lat;
							secondCoord.lon = room.lon;
						}
						if (firstCoord.lat !== 0  && secondCoord.lat !== 0) {
							resolve(this.calculateDistance(firstCoord, secondCoord) * 1000);
						}
					}
				}
			}
			reject("Location of one more more buildings unknown, cannot find distance");
		});

	}

	private calculateDistance(firstCoord: { lat: number; lon: number }, secondCoord: { lat: number; lon: number }) {
		let latDistance = Math.abs(Math.abs(firstCoord.lat) - Math.abs(secondCoord.lat)) * 110;
		let lonDistance = Math.abs(Math.abs(firstCoord.lon) - Math.abs(secondCoord.lon)) * 85;
		let result = Math.sqrt(latDistance * latDistance + lonDistance * lonDistance);
		return result;
	}

	private checkShortName(str: string) {
		let alphabet = /^[a-zA-Z]+$/;
		return str.length <= 2 || str.length >= 5 || !alphabet.test(str);

	}
}
