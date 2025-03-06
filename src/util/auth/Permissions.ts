//import 'server-only';
import {AccessGroup} from "~/common/enum/enumerations";

export function isAdmin(type?: AccessGroup) {
    return type === AccessGroup.ADMIN;
}