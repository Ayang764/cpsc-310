import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import * as fs from "fs";


export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static facade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		Server.facade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {

		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		this.express.put("/dataset/:id/:kind", Server.addFile);
		this.express.delete("/dataset/:id", Server.removeFile);
		this.express.get("/distance/:first/:second", Server.calculateDistance);
		this.express.post("/query", Server.query);
		this.express.get("/dataset", Server.listDataset);
		// TODO: your other endpoints should go here

	}

	private static query(req: Request, res: Response) {
		Server.facade.performQuery(req.body).then((result) => {
			res.status(200).json({result: result});
		}).catch((error) => {
			res.status(400).json({error: error.message});
		});
	}

	private static calculateDistance(req: Request, res: Response) {
		console.log(`Server::calculateDistance(..) - params: ${JSON.stringify(req.params)}`);
		const first: string = req.params.first.toUpperCase();
		// console.log(first);
		const second: string = req.params.second.toUpperCase();
		// console.log(second);
		Server.facade.dataset.getDistances(first, second).then((result) => {
			if (result === 0) {
				res.status(400).json({error: "Your building inputs are the same!"});
			}
			let resultMsg = first + " and " + second + " are " + result + " meters away.";
		}).catch((err) => {
			res.status(400).json({error: err});
		});
	}

	private static listDataset(req: Request, res: Response) {
		Server.facade.listDatasets().then((result) => {
			console.log("Server::listDataset(... )ran listDataset()");
			res.status(200).json({result: result});
		});
	}

	private static addFile(req: Request, res: Response) {
		console.log(`Server::addFile(..) - params: ${JSON.stringify(req.params)}`);
		const id: string = req.params.id;
		let kind: string = req.params.kind;
		let type: InsightDatasetKind;
		if (kind === "Room") {
			type = InsightDatasetKind.Rooms;
		} else if (kind === "Course") {
			type = InsightDatasetKind.Courses;
		} else {
			throw new InsightError("Incorrect dataset type input");
		}
		let content = req.body.toString("base64");
		Server.facade.addDataset(id, content, type).then((response: any) => {
			console.log("Finished adding dataset");
			res.status(200).json({result: response});
		}).catch((err) => {
			// console.log(err);
			// res.status(400).json({error: err});
			if (err instanceof (InsightError)) {
				res.status(400).send({error: err.message});
			} else {
				res.status(400).json({error: err});
			}
		});
	}

	private static removeFile(req: Request, res: Response) {
		console.log(`Server::removeFile(..) - params: ${JSON.stringify(req.params)}`);
		const id: string = req.params.id;
		console.log(id);
		Server.facade.removeDataset(id).then((response: any) => {
			res.status(200).json({result: response + " removed"});
		}).catch((err) => {
			// console.log(err);
			// res.status(400).json({error: err});
			if (err instanceof (NotFoundError)) {
				res.status(404).send({error: err.message});
			} else if (err instanceof (InsightError)) {
				res.status(400).send({error: err.message});
			} else {
				res.status(400).json({error: err.message});
			}
		});

	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}!!!${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
