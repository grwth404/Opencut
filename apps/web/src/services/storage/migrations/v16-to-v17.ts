import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV16ToV17 } from "./transformers/v16-to-v17";

export class V16toV17Migration extends StorageMigration {
	from = 16;
	to = 17;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV16ToV17({ project });
	}
}
