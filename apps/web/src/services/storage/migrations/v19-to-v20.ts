import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV19ToV20 } from "./transformers/v19-to-v20";

export class V19toV20Migration extends StorageMigration {
	from = 19;
	to = 20;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV19ToV20({ project });
	}
}
