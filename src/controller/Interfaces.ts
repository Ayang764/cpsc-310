import {InsightDatasetKind} from "./IInsightFacade";

export interface Building {
	[key: string]: Room;
}

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export interface Room {
	"fullname": string;
	"shortname": string;
	"number": string;
	"name": string;
	"address": string;
	"lat": number;
	"lon": number;
	"seats": number;
	"type": string;
	"furniture": string;
	"href": string;

}

// Object that is created when called by addDataset in InsightFacade
// Object is stored in a Dataset object containing a list of DatasetObjects
// Based on the InsightDatasetKind, either rooms or courses will be filled with content
export interface DatasetObject {
	"id": string;
	"courses": SingleCourse[];
	"rooms": Room[];
	"kind": InsightDatasetKind;
}

// interface for an individual course section
export interface SingleCourse {
	"dept": string;
	"id": string;
	"avg": number;
	"instructor": string;
	"title": string;
	"pass": number;
	"fail": number;
	"audit": number;
	"uuid": string;
	"year": number;
}
