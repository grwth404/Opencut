import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV10ToV11 } from "./transformers/v10-to-v11";

export class V10toV11Migration extends StorageMigration {
	from = 10;
	to = 11;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV10ToV11({ project });
	}
}
