import {ValidateHelper} from "./ValidateHelper";
import {InsightDatasetKind} from "./IInsightFacade";

export class ValidateTransformations {
	protected valid: boolean = true;
	protected transformKeys: string[] = [];
	protected applyTokens: string[] = [];
	protected mFieldsCourses = ["avg", "pass", "fail", "audit", "year"];
	protected mFieldsRooms = ["lat", "lon", "seats"];
	protected kind: any;
	protected validateHelper = new ValidateHelper();

	public getTransformValid() {
		return this.valid;
	}

	public getTransformKeys() {
		return this.transformKeys;
	}

	public getApplyTokens() {
		return this.applyTokens;
	}

	public validateTransformations(queryElement: any, id: string, kind: InsightDatasetKind) {
		this.kind = kind;
		if (!("GROUP" in queryElement) || !("APPLY" in queryElement)) {
			this.valid = false;
			return;
		} else {
			for (let key of Object.keys(queryElement)) {
				if (key === "GROUP") {
					this.validateGroup(queryElement["GROUP"], id);
				} else if (key === "APPLY") {
					this.validateApply(queryElement["APPLY"], id);
				} else {
					this.valid = false;
					return;
				}
			}
		}
	}

	private validateGroup(queryElement: any, id: string) {
		if (!Array.isArray(queryElement)) {
			this.valid = false;
			return;
		} else if (queryElement.length === 0) {
			this.valid = false;
			return;
		} else {
			for (let element of queryElement) {
				this.validateHelper.idCheck(element, id);
				this.transformKeys.push(element);
			}
		}
	}

	private validateApply(queryElement: any, id: string) {
		let applyKeys = [];
		let validTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		if (!Array.isArray(queryElement)) {
			this.valid = false;
			return;
		} else {
			for (let element of queryElement) {
				if (Object.keys(element).length !== 1) {
					this.valid = false;
					return;
				}
				let key = Object.keys(element)[0];
				applyKeys.push(key);
				this.applyTokens.push(key);
				console.log(this.applyTokens);
				this.transformKeys.push(key);
				// the condition in the if statement is from https://stackoverflow.com/questions/19655975/check-if-an-array-contains-duplicate-values/42813534
				if (applyKeys.length === new Set(applyKeys).size) {
					if (validTokens.includes(Object.keys(element[key])[0])) {
						this.validateHelper.idCheck(element[key][Object.keys(element[key])[0]], id);
						if (Object.keys(element[key])[0] !== "COUNT") {
							let keyNoId = element[key][Object.keys(element[key])[0]].split("_", 2)[1];
							if (this.kind === "courses") {
								if (!this.mFieldsCourses.includes(keyNoId)) {
									this.valid = false;
									return;
								}
							} else {
								if (!this.mFieldsRooms.includes(keyNoId)) {
									this.valid = false;
									return;
								}
							}
						}
					} else {
						this.valid = false;
					}
				} else {
					this.valid = false;
				}
			}
		}
	}
}
