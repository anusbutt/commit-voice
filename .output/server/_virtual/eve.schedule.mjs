import { fileURLToPath as __eveFileURLToPath } from "node:url";
import { dirname as __eveDirname } from "node:path";
__eveDirname(__eveFileURLToPath(import.meta.url));
import { t as dispatchScheduleTask } from "../_libs/eve.mjs";
//#region #eve-schedule-task/eve.schedule.c2NoZWR1bGVzL2RhaWx5LXBvc3RzLnRz
const config = {
	"appRoot": "/mnt/c/Users/PC/Desktop/Eve agent/commit-voice",
	"dev": false
};
var eve_schedule_default = {
	meta: { description: "Run eve schedule \"daily-posts\" from \"schedules/daily-posts.ts\"." },
	async run(event) {
		return { result: await dispatchScheduleTask(event.name, config) };
	}
};
//#endregion
export { eve_schedule_default as default };
