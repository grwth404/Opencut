export { StorageMigration } from "./base";
import { V0toV1Migration } from "./v0-to-v1";
import { V1toV2Migration } from "./v1-to-v2";
import { V2toV3Migration } from "./v2-to-v3";
import { V3toV4Migration } from "./v3-to-v4";
import { V4toV5Migration } from "./v4-to-v5";
import { V5toV6Migration } from "./v5-to-v6";
import { V6toV7Migration } from "./v6-to-v7";
import { V7toV8Migration } from "./v7-to-v8";
import { V8toV9Migration } from "./v8-to-v9";
import { V9toV10Migration } from "./v9-to-v10";
import { V10toV11Migration } from "./v10-to-v11";
import { V11toV12Migration } from "./v11-to-v12";
import { V12toV13Migration } from "./v12-to-v13";
import { V13toV14Migration } from "./v13-to-v14";
import { V14toV15Migration } from "./v14-to-v15";
import { V15toV16Migration } from "./v15-to-v16";
import { V16toV17Migration } from "./v16-to-v17";
import { V17toV18Migration } from "./v17-to-v18";
import { V18toV19Migration } from "./v18-to-v19";
export { runStorageMigrations } from "./runner";
export type { MigrationProgress } from "./runner";

export const CURRENT_PROJECT_VERSION = 19;

export const migrations = [
	new V0toV1Migration(),
	new V1toV2Migration(),
	new V2toV3Migration(),
	new V3toV4Migration(),
	new V4toV5Migration(),
	new V5toV6Migration(),
	new V6toV7Migration(),
	new V7toV8Migration(),
	new V8toV9Migration(),
	new V9toV10Migration(),
	new V10toV11Migration(),
	new V11toV12Migration(),
	new V12toV13Migration(),
	new V13toV14Migration(),
	new V14toV15Migration(),
	new V15toV16Migration(),
	new V16toV17Migration(),
	new V17toV18Migration(),
	new V18toV19Migration(),
];
