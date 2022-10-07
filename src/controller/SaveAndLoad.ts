import {DatasetObject} from "./Interfaces";
import * as fs from "fs";

export class SaveAndLoad {
	private dirFolder = "./data"
	private directory = "./data/saved-data.json"

	public save(listDataset: DatasetObject[]) {
		try {
			console.log("Saving dataset with length " + listDataset.length);
			let data = JSON.stringify(listDataset);
			fs.writeFileSync(this.directory, data);
			console.log("Dataset saved");
		} catch (error) {
			console.log("save error thrown");
		}
	}

	private checkForFolder() {
		if (!fs.existsSync(this.dirFolder)) {
			console.log("Save folder does not exist: creating folder");
			fs.mkdirSync(this.dirFolder);
		}
		if (!fs.existsSync(this.directory)) {
			console.log("Save file does not exist: creating save file");
			this.createSaveFile();
		}
	}

	private createSaveFile() {
		fs.writeFile(this.directory, "{}", function (err) {
			if (err) {
				// console.log("ran here");
				return console.log(err);
			}
			console.log("save file created");
		});
	}

	public load(): DatasetObject[]{
		try {
			this.checkForFolder();
			if (fs.existsSync(this.directory)) {
				let toConvert = fs.readFileSync(this.directory);
				if (toConvert.toJSON().data.length === 0) {
					return [];
				}
				let result: DatasetObject[] = JSON.parse(toConvert.toString());
				return result;
			}
			// console.log("properly loaded");
			return [];
		} catch (error) {
			console.log("load error" + error);
			return [];
		}
	}
}
