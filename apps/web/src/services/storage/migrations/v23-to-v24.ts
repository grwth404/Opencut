import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV23ToV24 } from "./transformers/v23-to-v24";

export class V23toV24Migration extends StorageMigration {
	from = 23;
	to = 24;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV23ToV24({ project });
	}
}
