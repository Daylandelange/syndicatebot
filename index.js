const Discord = require('discord.js');
const winston = require('winston');
const { Op } = require('sequelize');
const { prefix, token, testToken, ytAPI } = require('./config.json');
const { Users, CurrencyShop } = require('./dbObjects');
const botCommands = require('./commands');
var moment = require('moment');
const bot = new Discord.Client();
const profile = new Discord.Collection();
const cooldowns = new Discord.Collection();
var active = new Map();
bot.commands = new Discord.Collection();
moment().format();


const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'MM-DD HH:mm:ss',
		}),
		winston.format.printf(log => `(${log.timestamp}) [${log.level.toUpperCase()}] - ${log.message}`),
		winston.format.colorize(),
	),

	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'log.log' })
	]
})


Object.keys(botCommands).map(key => {
	bot.commands.set(botCommands[key].name, botCommands[key]);
});


bot.login(token);

//Execute on bot start
bot.on('ready', async () => {
	const storedBalances = await Users.findAll();
	storedBalances.forEach(b => profile.set(b.user_id, b));
	logger.log('info', `Logged in as ${bot.user.tag}!`);
	bot.user.setActivity('The Syndicate', { type: 'WATCHING' });
});


//Add db commands
Reflect.defineProperty(profile, 'addMoney', {
	value: async function addMoney(id, amount) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		user.balance += Number(amount);
		return user.save();
	},
});

Reflect.defineProperty(profile, 'getBalance', {
	value: async function getBalance(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		return user ? Math.floor(user.balance) : 0;
	},
});

Reflect.defineProperty(profile, 'getDaily', {
	value: async function getDaily(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		return user ? user.lastDaily : 0;
	},

});

Reflect.defineProperty(profile, 'setDaily', {
	value: async function setDaily(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);

		var currentDay = moment().dayOfYear();
		user.lastDaily = currentDay;
		return user.save();
	},
});

Reflect.defineProperty(profile, 'getHourly', {
	value: async function getHourly(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		return user ? user.lastHourly : 0;
	},

});

Reflect.defineProperty(profile, 'setHourly', {
	value: async function setHourly(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);

		var day = moment();
		user.lastHourly = day;
		return user.save();
	},
});

Reflect.defineProperty(profile, 'addCount', {
	value: async function addCount(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		user.msgCount++;
		return user.save();
	},
});

Reflect.defineProperty(profile, 'getCount', {
	value: async function getCount(id) {
		var user = profile.get(id);
		if (!user) user = await newUser(id);
		return user ? Math.floor(user.msgCount) : 0;
	},
});

async function newUser(id) {
	const date = moment();
	const day = moment().dayOfYear();
	const newUser = await Users.create({
		user_id: id,
		balance: 1,
		lastDaily: (day - 1),
		lastHourly: date,
		msgCount: 1
	});
	profile.set(id, newUser);
	return newUser;
}

module.exports = { profile };

//Logger
bot.on('debug', m => logger.log('debug', m));
bot.on('warn', m => logger.log('warn', m));
bot.on('error', m => logger.log('error', m));
process.on('unhandledRejection', m => logger.log('error', m));
process.on('TypeError', m => logger.log('error', m));
process.on('uncaughtException', m => logger.log('error', m));

//Execute for every message
bot.on('message', async msg => {
	//split message for further use
	const args = msg.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const now = Date.now();
	const id = msg.author.id;
	const user = profile.get(id);
	if (!user) {
		await newUser(id);
	}

	profile.addCount(id);

	//money reward
	if (!msg.author.bot && !msg.content.startsWith(prefix)) {
		if (!cooldowns.has("reward")) {
			cooldowns.set("reward", new Discord.Collection());
		}

		const cd = cooldowns.get("reward");
		const cdAmount = 8000;

		if (cd.has(msg.author.tag)) {
			const cdTime = cd.get(msg.author.tag) + cdAmount;

			if (now < cdTime) {
				return;
			}
		}
		const reward = 0.8 + (Math.random() * 0.6);
		profile.addMoney(msg.author.id, reward);

		cd.set(msg.author.tag, now);
		setTimeout(() => cd.delete(msg.author.tag), cdAmount);
	}

	//check for prefix
	if (!msg.content.startsWith(prefix)) return;

	logger.log('info', `${msg.author.tag} Called command: ${commandName}`);

	const command = bot.commands.get(commandName)
		|| bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	//check for admin
	if (command.admin) {
		if (!msg.member.hasPermission('ADMINISTRATOR')) {
			return msg.channel.send("You need Admin privileges to use this command!");
		}
	}

	//check for owner
	if (command.owner) {
		if (msg.author.id != 137920111754346496) {
			return msg.channel.send("You are not the owner of this bot!");
		}
	}

	//cooldowns
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(msg.author.id)) {
		const expirationTime = timestamps.get(msg.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return msg.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}
	timestamps.set(msg.author.id, now);
	setTimeout(() => timestamps.delete(msg.author.id), cooldownAmount);

	//if the command is used wrongly correct the user
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${msg.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return msg.channel.send(reply);
	}

	var options = {
		active: active
	}

	//execute command
	try {
		command.execute(msg, args, profile, bot, options, ytAPI, logger);
	} catch (error) {
		logger.log('error', error);
		msg.reply('there was an error trying to execute that command!');
	}
});
