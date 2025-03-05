COPY ((SELECT json_agg(row_to_json(action)) :: text FROM (
	SELECT action."ActionID", action."DateTimeEntered" as created, 
	action."DateTimeModified" as updated, action."Description", 
	action."ContactGroupID", action."DateTimeStart", 
	action."DateTimeEnd", "tAction"."Name" as Type,
	action."StaffGroupID", action."bIsScheduled"
	"tActionStatus"."Name" as Status, "tPriority"."Name" as Priority, 
	action."ObjectiveUID", action."SysUserID" FROM "Actions" as action
	LEFT JOIN "tAction"
	ON "tAction"."tActionID" = action."tActionTypeID"
	LEFT JOIN "tActionStatus"
	ON "tActionStatus"."tActionStatusID" = action."tActionStatusID"
	LEFT JOIN "tPriority"
	ON "tPriority"."tPriorityID" = action."tPriorityID") as action) to 'X:\Coding\converse-crm\g4\actions.json';
COPY ((SELECT json_agg(row_to_json(addr)) :: text FROM (
	SELECT "AddressID", 
		"ContactGroupID", 
		"Address1", 
		"Address2", 
		"Company", 
		"City", 
		"Zip/PostalCode", 
		"ImportantInfo", 
		"tState"."Name" as State, 
		"tCountry"."Name" as Country 
		FROM "Address"
	LEFT JOIN "tState" ON "tState"."tStateID" = "Address"."tStateID"
	LEFT JOIN "tCountry" ON "tCountry"."tCountryID" = "Address"."tCountryID"
) as addr)) to 'X:\Coding\converse-crm\g4\address.json';
COPY (SELECT json_agg(row_to_json(_group)) :: text FROM (
	SELECT "ContactGroupID", "ContactGroup"."Name", "ImportantInfo", "URL", "tType"."Name" as type, "tList"."Name" as status FROM "ContactGroup"
	LEFT JOIN "tType" on "tType"."tTypeID" = "ContactGroup"."tTypeID"
	LEFT JOIN "tList" on "tList"."tListID" = "ContactGroup"."tListID"
) as _group) to 'X:\Coding\converse-crm\g4\contact-group.json';
COPY (SELECT json_agg(row_to_json(_join)) :: text FROM (
	SELECT "ContactGroupID", "IndividualID", "tPosition"."Name" as position FROM "ContactGroup2Indiv"
	LEFT JOIN "tPosition" ON "tPosition"."tPositionID" = "ContactGroup2Indiv"."tPositionID"
) as _join) to 'X:\Coding\converse-crm\g4\contact-group-indv.json';
COPY (select json_agg(row_to_json(Email)) :: text from "Email" as Email) to 'X:\Coding\converse-crm\g4\email.json';
COPY (SELECT json_agg(row_to_json(date)) :: text FROM (
	SELECT "ImportantDateID", "ContactGroupID", "Date", "Description", "tImpDate"."Name" FROM "ImportantDate"
	LEFT JOIN "tImpDate"
	ON "tImpDate"."tImpDateID" = "ImportantDate"."tImpDateID"
) as date) to 'X:\Coding\converse-crm\g4\important-date.json';
COPY (select json_agg(row_to_json(Individual)) :: text from "Individual" as Individual) to 'X:\Coding\converse-crm\g4\individual.json';
COPY (SELECT json_agg(row_to_json(relation)) :: text FROM (
	SELECT "IndividualID1", position1."Name" as position1, "IndividualID2", position2."Name" as position2 FROM "Indv2Indv"
	LEFT JOIN "tPosition" as position1 ON position1."tPositionID" = "tPositionID1"
	LEFT JOIN "tPosition" as position2 ON position2."tPositionID" = "tPositionID2"
) as relation) to 'X:\Coding\converse-crm\g4\relations.json';
COPY (select json_agg(row_to_json(Note)) :: text from "Note" as Note) to 'X:\Coding\converse-crm\g4\note.json';
COPY (select json_agg(row_to_json(Objectives)) :: text from "Objectives" as Objectives) to 'X:\Coding\converse-crm\g4\objective.json';
COPY (select json_agg(row_to_json(Phone)) :: text from (
	SELECT "PhoneID", "tPhone"."Name" as type, "Number", "ContactGroupID", "ImportantInfo", '800' as "AreaCode" FROM "Phone"
	LEFT JOIN "tPhone" on "tPhone"."tPhoneID" = "Phone"."tPhoneID"
) as Phone) to 'X:\Coding\converse-crm\g4\phone.json';
COPY (select json_agg(row_to_json(_user)) :: text from (
	SELECT "SysUserID", "Individual"."FirstName", "Individual"."LastName", "SysUser"."Initials" FROM "SysUser"
	LEFT JOIN "Individual" ON "Individual"."IndividualID" = "SysUser"."IndividualID"
) as _user) to 'X:\Coding\converse-crm\g4\users.json';
COPY (select json_agg(row_to_json(_staffGroup)) :: text from "StaffGroup2SysUser" as _staffGroup) to 'X:\Coding\converse-crm\g4\user-groups.json';