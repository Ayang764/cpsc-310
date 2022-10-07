import {DatasetObject} from "./Interfaces";
import {ValidateTransformations} from "./ValidateTransformations";
export class ValidateHelper {
	protected valid: boolean;
	protected transform: boolean;
	protected mFieldsCourses = ["avg", "pass", "fail", "audit", "year"];
	protected sFieldsCourses = ["dept", "id", "instructor", "title", "uuid"];
	protected mFieldsRooms = ["lat", "lon", "seats"];
	protected sFieldsRooms = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	protected transformKeys: string[] = [];
	protected applyTokens: string[] = [];
	protected kind: any;
	constructor() {
		this.valid = true;
		this.transform = false;
	}

	public getValid() {
		return this.valid;
	}

	public getTransform() {
		return this.transform;
	}

	public validateQuery(query: any, id: string, dataset: DatasetObject) {
		this.kind = dataset.kind;
		for (let key of Object.keys(query)) {
			if (key !== "TRANSFORMATIONS" && key !== "WHERE" && key !== "OPTIONS") {
				console.log("1");
				this.valid = false;
				return;
			}
		}
		if ("TRANSFORMATIONS" in query) {
			const transformValid = new ValidateTransformations();
			this.transform = true;
			transformValid.validateTransformations(query["TRANSFORMATIONS"], id, this.kind);
			this.applyTokens = transformValid.getApplyTokens();
			this.transformKeys = transformValid.getTransformKeys();
			if (this.valid === true) {
				this.valid = transformValid.getTransformValid();
			}
		}
		this.validateWhere(query["WHERE"], id);
		this.validateOptions(query["OPTIONS"], id);
	}

	private validateWhere(query: any, id: string) {
		if (Object.keys(query).length === 0) {
			return;
		}
		let key = Object.keys(query)[0];
		if (key === "AND" || key === "OR") {
			if (!Array.isArray(query[key])) {
				console.log("2");
				this.valid = false;
			} else if (query[key].length === 0) {
				console.log("3");
				this.valid = false;
			} else {
				for (let element of query[key]) {
					if (typeof element !== "object") {
						console.log("4");
						this.valid = false;
						return;
					}
					if (Object.keys(element).length !== 1) {
						console.log("5");
						this.valid = false;
						return;
					}
					this.validateWhere(element, id);
				}
			}
		} else if (key === "NOT") {
			if (typeof query["NOT"] !== "object") {
				console.log("6");
				this.valid = false;
				return;
			}
			if (Object.keys(query["NOT"]).length !== 1) {
				console.log("7");
				this.valid = false;
				return;
			}
			this.validateWhere(query["NOT"], id);
		} else if (key === "LT" || key === "GT" || key === "EQ" || key === "IS") {
			if (typeof query[key] !== "object") {
				this.valid = false;
				return;
			}
			this.validateComparator(query[key], key, id);
		} else {
			console.log("9");
			this.valid = false;
		}
	}

	private validateComparator(query: any, comparator: string, id: string) {
		if (Object.keys(query).length !== 1) {
			this.valid = false;
			return;
		}
		let key = Object.keys(query)[0];
		this.idCheck(key, id);
		if (comparator === "LT" || comparator === "GT" || comparator === "EQ") {
			if (this.kind === "courses") {
				if (!this.mFieldsCourses.includes(key.split("_", 2)[1])) {
					console.log("11");
					this.valid = false;
				}
			} else {
				if (!this.mFieldsRooms.includes(key.split("_", 2)[1])) {
					console.log("12");
					this.valid = false;
				}
			}
			if (typeof query[key] !== "number") {
				console.log("13");
				this.valid = false;
			}
		} else {
			if (this.kind === "courses") {
				if (!this.sFieldsCourses.includes(key.split("_", 2)[1])) {
					console.log("14");
					this.valid = false;
				}
			} else {
				if (!this.sFieldsRooms.includes(key.split("_", 2)[1])) {
					this.valid = false;
				}
			}
			if (typeof query[key] !== "string") {
				this.valid = false;
			} else {
				let noStar = query[key];
				if (query[key].startsWith("*")) {
					noStar = noStar.substring(1, noStar.length);
				}
				if (noStar.endsWith("*")) {
					noStar = noStar.substring(0, noStar.length - 1);
				}
				if (noStar.includes("*")) {
					this.valid = false;
				}
			}
		}
	}

	private validateOptions(query: any, id: string) {
		for (let key of Object.keys(query)) {
			if (key !== "COLUMNS" && key !== "ORDER") {
				console.log("18");
				this.valid = false;
				return;
			}
		}
		this.validateColumns(query["COLUMNS"], id);
		if ("ORDER" in query) {
			this.validateOrder(query["ORDER"], id, query["COLUMNS"]);
		}
	}

	private validateColumns(columns: any, id: string) {
		for (let element of columns) {
			if (!this.transform) {
				this.idCheck(element, id);
			} else {
				if (!this.transformKeys.includes(element)) {
					console.log("19");
					this.valid = false;
					return;
				} else {
					this.idCheck(element, id);
				}
			}
		}
	}

	private validateOrder(order: any, id: string, columns: any) {
		if (typeof order === "string") {
			this.simpleSortCheck(order, id, columns);
		} else if (typeof order === "object") {
			this.complexSortCheck(order, id, columns);
		} else {
			console.log("20");
			this.valid = false;
			return;
		}
	}

	private simpleSortCheck(keyToCheck: string, id: string, columns: string[]) {
		this.idCheck(keyToCheck, id);
		if (!columns.includes(keyToCheck)) {
			this.valid = false;
			return;
		}
	}

	private complexSortCheck(queryElement: any, id: string, columns: string[]) {
		if (!("dir" in queryElement) || !("keys" in queryElement)) {
			this.valid = false;
			return;
		} else {
			for (let key of Object.keys(queryElement)) {
				if (key !== "dir" && key !== "keys") {
					this.valid = false;
					return;
				} else if (key === "dir") {
					if (typeof queryElement[key] !== "string") {
						this.valid = false;
						return;
					}
					if (queryElement[key] !== "UP" && queryElement[key] !== "DOWN") {
						this.valid = false;
						return;
					}
				} else {
					if (!Array.isArray(queryElement[key])) {
						this.valid = false;
						return;
					} else {
						if (queryElement[key].length === 0) {
							this.valid = false;
							return;
						}
						for (let element of queryElement[key]) {
							if (!columns.includes(element)) {
								this.valid = false;
								return;
							}
							this.idCheck(element, id);
						}
					}
				}
			}
		}
	}

	public idCheck(key: any, id: string) {
		if (typeof key !== "string") {
			this.valid = false;
			return;
		}
		let idToCheck = key.split("_", 2);
		if (this.applyTokens.includes(key)) {
			return;
		}
		if (this.kind === "courses") {
			if (!this.mFieldsCourses.includes(idToCheck[1]) && !this.sFieldsCourses.includes(idToCheck[1])) {
				this.valid = false;
				return;
			}
		} else {
			if (!this.mFieldsRooms.includes(idToCheck[1]) && !this.sFieldsRooms.includes(idToCheck[1])) {
				this.valid = false;
				return;
			}
		}
		if (idToCheck[0] !== id) {
			this.valid = false;
			return;
		}
	}


}
