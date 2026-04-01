import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV20ToV21 } from "./transformers/v20-to-v21";

export class V20toV21Migration extends StorageMigration {
	from = 20;
	to = 21;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV20ToV21({ project });
	}
}
