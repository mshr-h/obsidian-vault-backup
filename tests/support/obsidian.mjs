export { default as moment } from "moment";

export const Platform = { isWin: process.platform === "win32" };

export class Notice {
	constructor(message) {
		this.message = message;
	}
}
