import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV15ToV16 } from "./transformers/v15-to-v16";

export class V15toV16Migration extends StorageMigration {
	from = 15;
	to = 16;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV15ToV16({ project });
	}
}
