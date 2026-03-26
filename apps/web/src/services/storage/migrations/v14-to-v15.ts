import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV14ToV15 } from "./transformers/v14-to-v15";

export class V14toV15Migration extends StorageMigration {
	from = 14;
	to = 15;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV14ToV15({ project });
	}
}
