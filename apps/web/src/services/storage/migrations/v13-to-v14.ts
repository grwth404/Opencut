import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV13ToV14 } from "./transformers/v13-to-v14";

export class V13toV14Migration extends StorageMigration {
	from = 13;
	to = 14;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV13ToV14({ project });
	}
}
