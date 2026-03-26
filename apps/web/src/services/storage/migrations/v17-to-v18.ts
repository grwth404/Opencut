import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV17ToV18 } from "./transformers/v17-to-v18";

export class V17toV18Migration extends StorageMigration {
	from = 17;
	to = 18;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV17ToV18({ project });
	}
}
