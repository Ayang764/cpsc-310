import {SingleCourse} from "./Interfaces";
import {CONNREFUSED} from "dns";
import Decimal from "decimal.js";

export class TransformationHelper {
	protected resultArray: any = [];
	protected array2: any = [];
	protected mfield = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];

	constructor() {/* constructor */}

	public transform(node: any, toFilter: any[]): any[] {
		const group = node["GROUP"];
		const apply = node["APPLY"];
		let result = this.handleGroup(group, toFilter);
		this.handleTransformColumns(result, group, apply);
		return this.resultArray;
	}

	private handleGroup(group: any[], toGroup: any[]) {
		let key1 = group[0];
		let keySplit = key1.split("_", 2);
		let keyNoID = keySplit[1];
		let result = this.groupBy(toGroup, keyNoID);
		this.handleGroupHelper(result, group, 1);
		return result;
	}

	private handleGroupHelper(object: any, key: any[], i: number) {

		if (i >= key.length) {
			return;
		}
		let keySplit = key[i].split("_", 2);
		let keyNoID = keySplit[1];
		for (let key1 of Object.keys(object)) {
			object[key1] = this.groupBy(object[key1], keyNoID);
		}
		i++;
		for (let key1 of Object.keys(object)) {
			this.handleGroupHelper(object[key1], key, i);
		}
	}

	// algorithm for grouping objects by same field from https://learnwithparam.com/blog/how-to-group-by-array-of-objects-using-a-key/
	private groupBy (array: any, key: any) {
		// Return the end result
		return array.reduce((result: any, currentValue: any) => {
			// If an array already present for key, push it to the array. Else create an array and push the object
			if (!result[currentValue[key]]) {
				result[currentValue[key]] = [];
			}
			result[currentValue[key]].push(currentValue);
			// Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
			return result;
		}, {}); // empty object is the initial value for result object
	}

	private handleTransformColumns(object: any, group: any[], apply: any) {
		if (Array.isArray(object)) {
			let result: any = {};
			for (let i = 0; i < group.length; i++) {
				let key = this.array2[i];
				let keySplit = group[i].split("_", 2);
				let keyNoID = keySplit[1];
				if (this.mfield.includes(keyNoID)) {
					key = Number(this.array2[i]);
				}
				result[group[i]] = key;
			}
			this.handleApply(apply, object, result);
			this.resultArray.push(result);
			return;
		}
		for (let key of Object.keys(object)) {
			this.array2.push(key);
			this.handleTransformColumns(object[key], group, apply);
			this.array2.pop();
		}
	}

	private handleApply(apply: any, object: any, result: any) {
		if (apply.length > 0) {
			for (let token of apply) {
				let key = Object.keys(token)[0];
				let key2 = Object.keys(token[key])[0];
				let res;
				switch (key2) {
					case "AVG":
						res = this.AVG(token, key, key2, object);
						break;
					case "MAX":
						res = this.MAX(token, key, key2, object);
						break;
					case "MIN":
						res = this.MIN(token, key, key2, object);
						break;
					case "COUNT":
						res = this.COUNT(token, key, key2, object);
						break;
					case "SUM":
						res = this.SUM(token, key, key2, object);
				}
				result[key] = res;
			}
		}
	}

	private AVG(token: any, key: string, key2: string, object: any) {
		let total = new Decimal(0);
		let numRows = 0;
		let keySplit = [token[key][key2]][0].split("_", 2);
		let keyNoID = keySplit[1];
		for (let element of object) {
			let num = new Decimal(element[keyNoID]);
			total = Decimal.add(total, num);
			numRows++;
		}
		let avg = total.toNumber() / numRows;
		let res = Number(avg.toFixed(2));
		return res;
	}

	private MAX(token: any, key: string, key2: string, object: any) {
		let maxArray = [];
		let keySplit = [token[key][key2]][0].split("_", 2);
		let keyNoID = keySplit[1];
		for (let element of object) {
			maxArray.push(element[keyNoID]);
		}
		let max = maxArray.reduce(function(a, b) {
			return Math.max(a, b);
		}, 0);
		return max;
	}

	private MIN(token: any, key: string, key2: string, object: any) {
		let minArray = [];
		let keySplit = [token[key][key2]][0].split("_", 2);
		let keyNoID = keySplit[1];
		for (let element of object) {
			minArray.push(element[keyNoID]);
		}
		let min = minArray[0];
		for(let i = 1; i < minArray.length; i++){
			if(minArray[i] < min){
				min = minArray[i];
			}
		}
		return min;
	}

	private SUM(token: any, key: string, key2: string, object: any) {
		let sum = 0;
		let keySplit = [token[key][key2]][0].split("_", 2);
		let keyNoID = keySplit[1];
		for (let element of object) {
			sum = sum + element[keyNoID];
		}
		return Number(sum.toFixed(2));
	}

	private COUNT(token: any, key: string, key2: string, object: any) {
		let countArray: any[] = [];
		let keySplit = [token[key][key2]][0].split("_", 2);
		let keyNoID = keySplit[1];
		for (let element of object) {
			if (!countArray.includes(element[keyNoID])) {
				countArray.push(element[keyNoID]);
			}
		}
		return countArray.length;
	}
}
