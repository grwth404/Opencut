import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV21ToV22 } from "./transformers/v21-to-v22";

export class V21toV22Migration extends StorageMigration {
	from = 21;
	to = 22;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV21ToV22({ project });
	}
}
