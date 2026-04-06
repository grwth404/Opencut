import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV22ToV23 } from "./transformers/v22-to-v23";

export class V22toV23Migration extends StorageMigration {
	from = 22;
	to = 23;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV22ToV23({ project });
	}
}
