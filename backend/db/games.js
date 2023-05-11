const db = require("./connection.js");

const gamebag = "INSERT INTO gamebag (value, color, gameid, userid, specialcard ) VALUES ($1, $2, $3, $4, $5)";

const CREATE_SQL = "INSERT INTO game DEFAULT VALUES RETURNING id";

const ADD_USER_SQL = "INSERT INTO game_users (user_id, game_id, table_order) VALUES ($1, $2, $3)";

const COUNT_PLAYERS="select count(table_order) from game_users where game_id=$1";

const JOIN_GAME = "INSERT INTO game_users (game_id, user_id, table_order) VALUES ($1, $2, $3)";

const AVVAILABLE_GAMES_LIST = "select id from game where is_started=false and id not in (select game_id from game_users where user_id=$1)";

const USER_GAMES = "select id from game where id in (select game_id from game_users where user_id=$1)";

const RUNNING_GAMES = "select id from game where is_started=true and id in (select game_id from game_users where user_id=$1)";





const create = async (user_id) => {
  console.log("hi");
  const { id } = await db.one(CREATE_SQL);

  console.log(await db.any("select * from game where id=$1",[id]));

  console.log({ game_id_created: id });

  await db.none(ADD_USER_SQL, [user_id, id, 0]);

  await db.none(JOIN_GAME,[id, user_id, ]);

  return { id };
};

const CREATING_USER_SQL = "SELECT username FROM users, game_users WHERE game_users.game_id=$1 AND table_order=0 AND game_users.user_id=users.id";

const creatingUser = async (game_id) => db.one(CREATING_USER_SQL, [game_id]);

const join = async (user_id, game_id) => {

  const { max } = await db.one(
    "SELECT MAX(table_order) FROM game_users WHERE game_id=$1",
    [game_id]
  );

  await db.none(JOIN_GAME, [game_id, user_id, max + 1]);

};

const getUsers = (game_id) =>
  db.any(
    "SELECT id, username FROM users, game_users WHERE game_users.game_id=$1 AND game_users.user_id=users.id",
    [game_id]
  );

const getAvailableGames = (user_id) => db.any(AVVAILABLE_GAMES_LIST,[user_id]);

const getRunningGames = (user_id) => db.any(RUNNING_GAMES,[user_id]);

const getGames = (user_id) => db.any(USER_GAMES,[user_id]);

const getAllGames = async () => {
  console.log("in getAllGamesMethod")
  return await db.any("select id from game");
};

let map = new Map;

const start = async (game_id) => {

  const colors=["blue","green","yellow","red"];

  colors.forEach(async element => {
    for(let i=0;i<10;i++){
      await db.none(gamebag,[i.toString(),element,game_id,0,'FALSE']);
    }
    await db.none(gamebag,["2",element,game_id,0,'TRUE']);
    await db.none(gamebag,["0",element,game_id,0,'TRUE']);
    await db.none(gamebag,["-1",element,game_id,0,'TRUE']);
    await db.none(gamebag,["4","nocolor",game_id,0,'TRUE']);
    await db.none(gamebag,["0","nocolor",game_id,0,'TRUE']);
  });

  //console.log(await db.multi("select player_id from gamebag where game_id=$1",[game_id]));
  

  let player_count;
  await db.one(COUNT_PLAYERS,[game_id]).then(data => {
    console.log(data["count"]);
    player_count = data["count"];
  })

  let current_game_users = await getUsers(game_id);

  var i=1;
  current_game_users.forEach(element => {
    map.set(i,element["id"]);
    i++;
  })



  await db.none("update game set is_started=true where id=$1",[game_id]);

  let shuffle_cards;

  await db.multi("select * from gamebag where gameid=$1 order by random() LIMIT $2",[game_id,player_count*7]).then(
    data=>{
      shuffle_cards = data[0];
    }
  );

  //await db.multi("select userid from game where id=$1",[game_id]).then(data => {
    //users=data[0];
 // });

 console.log(map);
 console.log(current_game_users);

  var count=1;

  console.log(shuffle_cards.length);

  shuffle_cards.forEach( async card => {
    await db.none("update gamebag set userid = $1 where gameid=$2 and value=$3 and color=$4 and specialcard=$5",[map.get(count%player_count),card["gameid"],card["value"],card["color"],card["specialcard"]]);
    count=count+1;
  })

  console.log(await db.any("select count(*) from gamebag where gameid=$1",[game_id]));

  console.log(await db.any("select * from gamebag where gameid=$1",[game_id]));
  console.log("hi dfksalj")
  console.log(await db.any("select * from gamebag where userid != $1 and gameid = $2", [0,game_id]));

  //console.log(shuffle_cards);
  console.log(player_count);
  console.log("start");
  
  
}
  



module.exports = {
  create,
  creatingUser,
  getUsers,
  join,
  start,
  getAvailableGames,
  getRunningGames,
  getGames,
  getAllGames,
};
