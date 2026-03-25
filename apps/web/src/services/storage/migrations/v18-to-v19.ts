import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV18ToV19 } from "./transformers/v18-to-v19";

export class V18toV19Migration extends StorageMigration {
	from = 18;
	to = 19;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV18ToV19({ project });
	}
}
