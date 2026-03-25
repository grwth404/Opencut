import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV11ToV12 } from "./transformers/v11-to-v12";

export class V11toV12Migration extends StorageMigration {
	from = 11;
	to = 12;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV11ToV12({ project });
	}
}
