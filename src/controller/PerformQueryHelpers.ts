import {DatasetObject, SingleCourse} from "./Interfaces";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {ValidateHelper} from "./ValidateHelper";

export class PerformQueryHelpers {
	protected kind: any;
	constructor() {/* constructor */
	}

	public handleWhere(node: any, dataset: DatasetObject, negate: boolean): any[] {
		if (Object.keys(node).length === 0) {
			if (dataset.kind === "courses") {
				return dataset.courses;
			} else {
				return dataset.rooms;
			}
		}
		let result: any[] = [];
		let key = Object.keys(node)[0];
		switch (key) {
			case "AND":
				if (negate) {
					result = this.orFunction(node, dataset, negate);
				} else {
					result = this.andFunction(node, dataset, negate);
				}
				break;
			case "OR":
				if (negate) {
					result = this.andFunction(node, dataset, negate);
				} else {
					result = this.orFunction(node, dataset, negate);
				}
				break;
			case "LT":
				result = this.mComparator("LT", dataset, node, negate);
				break;
			case "GT":
				result = this.mComparator("GT", dataset, node, negate);
				break;
			case "EQ":
				result = this.mComparator("EQ", dataset, node, negate);
				break;
			case "IS":
				result = this.stringSearch(dataset, node, negate);
				break;
			case "NOT":
				if (negate) {
					result = this.handleWhere(node["NOT"], dataset, false);
				} else {
					result = this.handleWhere(node["NOT"], dataset, true);
				}
		}
		return result;
	}

	private andFunction(node: any, dataset: DatasetObject, negate: boolean): any[] {
		let key = Object.keys(node)[0];
		let result: any[] = this.handleWhere(node[key][0], dataset, negate);
		for (let i = 1; i < node[key].length; i++) {
			let temp = this.handleWhere(node[key][i], dataset, negate);
			result = this.andList(result, temp);
		}
		return result;
	}

	private andList(arr1: any[], arr2: any[]) {
		let result = [];
		for (let element of arr1) {
			if (arr2.includes(element)) {
				result.push(element);
			}
		}
		return result;
	}

	private orFunction(node: any, dataset: DatasetObject, negate: boolean) {
		let key = Object.keys(node)[0];
		let result: any[] = this.handleWhere(node[key][0], dataset, negate);
		for (let i = 1; i < node[key].length; i++) {
			let temp = this.handleWhere(node[key][i], dataset, negate);
			result = this.orList(result, temp);
		}
		return result;
	}

	private orList(arr1: any[], arr2: any[]) {
		let result = arr1;
		for (let element of arr2) {
			if (!arr1.includes(element)) {
				result.push(element);
			}
		}
		return result;
	}


	private mComparator(comparator: string, dataset: DatasetObject, node: any, negate: boolean) {
		let coursesRooms: any;
		if (dataset.kind === "courses") {
			coursesRooms = dataset.courses;
		} else {
			coursesRooms = dataset.rooms;
		}
		let filter = node[comparator];
		let key = Object.keys(filter)[0];
		let keySplit = key.split("_", 2);
		let keyNoId = keySplit[1];
		if (comparator === "LT") {
			if (negate) {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey >= filter[key];
				});
			} else {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey < filter[key];
				});
			}
		} else if (comparator === "GT") {
			if (negate) {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey <= filter[key];
				});
			} else {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey > filter[key];
				});
			}
		} else {
			if (negate) {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey !== filter[key];
				});
			} else {
				return coursesRooms.filter((c: any) => {
					let courseKey = c[keyNoId];
					return courseKey === filter[key];
				});
			}
		}
	}


	private stringSearch(dataset: DatasetObject, node: any, negate: boolean): any[] {
		let coursesRooms: any = this.choose(dataset);
		let filter = node["IS"];
		let key = Object.keys(filter)[0];
		let keyNoId = key.split("_", 2)[1];
		const stringToSearch: string = filter[key];
		if (stringToSearch === "*" || stringToSearch === "**") {
			return coursesRooms;
		} else if (stringToSearch.startsWith("*") && stringToSearch.endsWith("*")) {
			let noStarFrontBack = stringToSearch.substring(1, stringToSearch.length - 1);
			return coursesRooms.filter((c: any) => {
				let courseKey = c[keyNoId];
				if (negate) {
					return !courseKey.includes(noStarFrontBack);
				} else {
					return courseKey.includes(noStarFrontBack);
				}
			});
		} else if (stringToSearch.endsWith("*")) {
			let noStarBack = stringToSearch.substring(0, stringToSearch.length - 1);
			return coursesRooms.filter((c: any) => {
				let courseKey = c[keyNoId];
				if (negate) {
					return !courseKey.startsWith(noStarBack);
				} else {
					return courseKey.startsWith(noStarBack);
				}
			});
		} else if (stringToSearch.startsWith("*")) {
			let noStarFront = stringToSearch.substring(1, stringToSearch.length);
			return coursesRooms.filter((c: any) => {
				let courseKey = c[keyNoId];
				if (negate) {
					return !courseKey.endsWith(noStarFront);
				} else {
					return courseKey.endsWith(noStarFront);
				}
			});
		} else {
			return coursesRooms.filter((c: any) => {
				let courseKey = c[keyNoId];
				if (negate) {
					return courseKey !== stringToSearch;
				} else {
					return courseKey === stringToSearch;
				}
			});
		}
	}

	private choose(dataset: DatasetObject) {
		if (dataset.kind === "courses") {
			return dataset.courses;
		} else {
			return dataset.rooms;
		}
	}

	public handleOptions(options: any, toFilter: any[], transform: boolean) {
		const columns = options["COLUMNS"];
		let result = toFilter;
		result = this.handleColumns(columns, result, transform);
		if (("ORDER" in options)) {
			const order = options["ORDER"];
			result = this.handleOrder(order, result);
		}
		return result;
	}

	private handleColumns(columns: any[], toFilter: any[], transform: boolean) {
		let resultArray = [];
		for (let element of toFilter) {
			let result: any = {};
			for (let key of columns) {
				let keySplit = key.split("_", 2);
				let keyNoID = keySplit[1];
				let data;
				if (transform) {
					data = element[key];
				} else {
					data = element[keyNoID];
				}
				result[key] = data;
			}
			resultArray.push(result);
		}
		return resultArray;
	}

	private handleOrder(order: any, toSort: any[]): any {
		if (typeof order === "string") {
			toSort = this.simpleSort(order, toSort);
		} else {
			toSort = this.complexSort(order, toSort);
		}
		return toSort;
	}

	private simpleSort(order: any, toSort: any[]) {
		toSort.sort((firstEl, secondEl) => {
			let c1 = firstEl[order];
			let c2 = secondEl[order];
			if (c1 > c2) {
				return 1;
			}
			if (c1 < c2) {
				return -1;
			}
			return 0;
		});
		return toSort;
	}

	private sortHelper(firstEl: any, secondEl: any, keysToCompare: string[], dir: string, i: number): number {
		let c1 = firstEl[keysToCompare[i]];
		let c2 = secondEl[keysToCompare[i]];
		if (c1 > c2) {
			if (dir === "UP") {
				return 1;
			} else {
				return -1;
			}
		} else if (c1 < c2) {
			if (dir === "UP") {
				return -1;
			} else {
				return 1;
			}
		} else {
			if (i < keysToCompare.length) {
				i++;
				return this.sortHelper(firstEl, secondEl, keysToCompare, dir, i);
			} else {
				return 0;
			}
		}
	}

	private complexSort(order: any, toSort: any[]) {
		let dir = order["dir"];
		let keys = order["keys"];
		let i = 0;
		toSort.sort((firstEl, secondEl) => {
			return this.sortHelper(firstEl, secondEl, keys, dir, i);
		});
		return toSort;
	}
}
