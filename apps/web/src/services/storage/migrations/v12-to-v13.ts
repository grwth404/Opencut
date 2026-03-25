import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV12ToV13 } from "./transformers/v12-to-v13";

export class V12toV13Migration extends StorageMigration {
	from = 12;
	to = 13;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV12ToV13({ project });
	}
}
