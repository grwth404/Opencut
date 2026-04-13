import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV24ToV25 } from "./transformers/v24-to-v25";

export class V24toV25Migration extends StorageMigration {
	from = 24;
	to = 25;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV24ToV25({ project });
	}
}
