import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV25ToV26 } from "./transformers/v25-to-v26";

export class V25toV26Migration extends StorageMigration {
	from = 25;
	to = 26;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV25ToV26({ project });
	}
}
