type Time = "morning" | "afternoon" | "evening" | "closed";
type SaveData = {

}

declare var getSave: () => SaveData;
declare var updateSave: (data: SaveData) => SaveData;
declare var getTime: () => Time;