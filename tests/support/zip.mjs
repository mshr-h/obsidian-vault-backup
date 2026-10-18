import { open } from "yauzl";

export function readZip(filename) {
	return new Promise((resolve, reject) => {
		open(filename, { lazyEntries: true }, (error, zip) => {
			if (error) return reject(error);
			const contents = new Map();
			const fail = (error) => { zip.close(); reject(error); };
			zip.on("error", fail);
			zip.on("end", () => resolve(contents));
			zip.on("entry", (entry) => {
				zip.openReadStream(entry, (error, stream) => {
					if (error) return fail(error);
					const chunks = [];
					stream.on("error", fail);
					stream.on("data", (chunk) => chunks.push(chunk));
					stream.on("end", () => {
						contents.set(entry.fileName, Buffer.concat(chunks));
						zip.readEntry();
					});
				});
			});
			zip.readEntry();
		});
	});
}
