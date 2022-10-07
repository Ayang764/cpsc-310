import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, ResultTooLargeError} from "./IInsightFacade";
import {PerformQueryHelpers} from "./PerformQueryHelpers";
import Dataset from "./Dataset";
import {DatasetObject, SingleCourse} from "./Interfaces";
import {ValidateHelper} from "./ValidateHelper";
import {TransformationHelper} from "./TransformationHelper";
import {SaveAndLoad} from "./SaveAndLoad";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */


export default class InsightFacade implements IInsightFacade {

	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.dataset = new Dataset();
		this.saveAndLoad = new SaveAndLoad();
		this.dataset.setDatasetList(this.saveAndLoad.load());
	}

	public dataset: Dataset;
	public saveAndLoad: SaveAndLoad;


	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		console.log("InsightFacade::addDataset(...) ran");
		return new Promise<string[]>((resolve, reject) => {
			this.dataset.setDatasetList(this.saveAndLoad.load());
			this.dataset.addDataset(id,content, kind).then(() => {
				let datasetId = [] as string[];
				let datasetList = this.dataset.getDatasetList();
				this.saveAndLoad.save(datasetList);
				for (let i of datasetList) {
					datasetId.push(i.id);
				}
				resolve(datasetId);
			}).catch((err) => {
				console.log("InsightFacade::addDataset(...) rejecting with: InsightError");
				reject(err);
			});
		});

	}

	public removeDataset(id: string): Promise<string | void> {
		console.log("InsightFacade::removeDataset(...) ran");
		return new Promise<string>((resolve, reject) => {
			this.dataset.setDatasetList(this.saveAndLoad.load());
			this.dataset.removeDataset(id).then((res) => {
				console.log(res + " deleted");
				this.saveAndLoad.save(this.dataset.getDatasetList());
				resolve(res);
			}).catch((err: any) => {
				console.log("InsightFacade::removeDataset(...) rejecting with InsightError");
				reject(err);
			});
		});
	}

	public performQuery(query: any): Promise<any[]> {
		const queryHelper = new PerformQueryHelpers();
		const validateHelper = new ValidateHelper();
		const transformHelper = new TransformationHelper();
		return new Promise( (resolve, reject)  => {
			if (!("WHERE" in query) || !("OPTIONS" in query)) {
				return reject(new InsightError());
			}
			const options = query["OPTIONS"];
			if (!("COLUMNS" in options)) {
				return reject(new InsightError());
			} else if (!Array.isArray(options["COLUMNS"])) {
				return reject(new InsightError());
			} else if (options["COLUMNS"].length === 0) {
				return reject(new InsightError());
			}
			const queryString: any = JSON.stringify(query);
			const firstId: string = queryString.match(/[a-z]+(?=_)/g)[0];
			const datasetList: DatasetObject[] = this.dataset.getDatasetList();
			let datasetIds = [];
			for (let element of datasetList) {
				datasetIds.push(element.id);
			}
			if (!datasetIds.includes(firstId)) {
				throw new InsightError();
			}
			let dataset: any;
			for (let datasetToFind of datasetList) {
				if (firstId === datasetToFind.id) {
					dataset = datasetToFind;
				}
			}
			validateHelper.validateQuery(query, firstId, dataset);
			if (!validateHelper.getValid()) {
				return reject(new InsightError());
			}
			let result: SingleCourse[] = [];
			let transform: boolean = validateHelper.getTransform();
			result = queryHelper.handleWhere(query["WHERE"], dataset,false);
			if (transform) {
				result = transformHelper.transform(query["TRANSFORMATIONS"], result);
			}
			result = queryHelper.handleOptions(options, result, transform);
			if (result.length > 5000) {
				return reject(new ResultTooLargeError());
			} else {
				return resolve(result);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		console.log("InsightFacade::listDataset() ran");
		return new Promise((resolve, reject) => {
			if (this.dataset.getDatasetList()) {
				this.dataset.setDatasetList(this.saveAndLoad.load());
			}
			let res = [] as InsightDataset[];
			let datasetList = this.dataset.getDatasetList();
			for (let i of datasetList) {
				let toAdd = {} as InsightDataset;
				toAdd.id = i.id;
				toAdd.kind = i.kind;
				switch (toAdd.kind) {
					case(InsightDatasetKind.Courses): {
						toAdd.numRows = i.courses.length;
						break;
					}
					case(InsightDatasetKind.Rooms): {
						toAdd.numRows = i.rooms.length;
						break;
					}
				}
				res.push(toAdd);
			}
			resolve(res);
		});
	}
}


