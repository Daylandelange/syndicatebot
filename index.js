const Discord = require('discord.js');
const winston = require('winston');
const { Users, Guilds, profile, guildProfile } = require('./dbObjects');
const clientCommands = require('./commands');
const moment = require('moment');
const client = new Discord.Client();
const cooldowns = new Discord.Collection();
require('dotenv').config();
const token = process.env.TEST_TOKEN;
const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const active = new Map();
client.commands = new Discord.Collection();
moment().format();


const logger = winston.createLogger({
	format: winston.format.combine(
		winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
		winston.format.printf(log => `(${log.timestamp}) [${log.level}] - ${log.message}`),

	),
	transports: [
		new winston.transports.Console({
			format: winston.format.colorize({
				all: true,
				colors: {
					error: 'red',
					info: 'cyan',
					warn: 'yellow',
					debug: 'green',
				},
			}),
		}),
		new winston.transports.File({
			filename: './logs/error.log',
			level: 'warn',
			format: winston.format.json(),
		}),
		new winston.transports.File({ filename: './logs/log.log' }),
	],
});


Object.keys(clientCommands).map(key => {
	client.commands.set(clientCommands[key].name, clientCommands[key]);
});

client.login(token);
client.on('ready', async () => {
	try {
		const storedUsers = await Users.findAll();
		storedUsers.forEach(b => profile.set(b.user_id, b));
		const storedGuilds = await Guilds.findAll();
		storedGuilds.forEach(b => guildProfile.set(b.guild_id, b));
		let memberTotal = 0;
		client.guilds.cache.forEach(guild => { if (!isNaN(memberTotal) && guild.id != 264445053596991498) memberTotal += Number(guild.memberCount); });
		client.user.setActivity(`with ${memberTotal} users.`);

		logger.log('info', `Logged in as ${client.user.tag}!`);
	}
	catch (e) {
		logger.error(e.stack);
	}
});

// Logger
client.on('warn', m => logger.warn(m));
client.on('error', m => logger.error(m));
process.on('warning', m => logger.warn(m));
process.on('unhandledRejection', m => logger.error(m));
process.on('TypeError', m => logger.error(m));
process.on('uncaughtException', m => logger.error(m));


client.on('message', async message => {
	if (message.author.bot) return;

	let guild = guildProfile.get(message.guild.id);
	if (!guild) guild = await guildProfile.newGuild(message.guild.id);
	const prefix = await guildProfile.getPrefix(message.guild.id);
	const id = message.author.id;
	let user = await profile.get(id);
	if (!user) user = await profile.newUser(id);


	// split message for further use
	const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);
	if (!prefixRegex.test(message.content)) return;

	const [, matchedPrefix] = message.content.match(prefixRegex);
	const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();


	// find command
	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;
	if (command.category == 'debug' && (id != 137920111754346496 && id != 139030319784263681)) return message.channel.send('You are not the owner of this bot!');
	if (command.category == 'admin' && !message.member.hasPermission('ADMINISTRATOR') && id != 137920111754346496 && id != 139030319784263681) return message.channel.send('You need Admin privileges to use this command!');
	if (command.category == 'pvp') await profile.resetProtection(id);


	// if the command is used wrongly correct the user
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;
		if (command.usage) reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		return message.channel.send(reply);
	}


	// cooldowns
	if (id != 137920111754346496) {
		if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Discord.Collection());
		const timestamps = cooldowns.get(command.name);
		const cooldownAmount = (command.cooldown || 1.5) * 1000;
		const now = Date.now();

		if (timestamps.has(id)) {
			const expirationTime = timestamps.get(id) + cooldownAmount;

			if (now < expirationTime) {
				const timeLeft = (expirationTime - now) / 1000;
				const hourLeft = timeLeft / 3600;
				const minLeft = (hourLeft - Math.floor(hourLeft)) * 60;
				const secLeft = Math.floor((minLeft - Math.floor(minLeft)) * 60);
				if (hourLeft >= 1) return message.reply(`Please wait **${Math.floor(hourLeft)} hours**, **${Math.floor(minLeft)} minutes** and **${secLeft} seconds** before reusing the \`${command.name}\` command.`);
				else if (minLeft >= 1) return message.reply(`Please wait **${Math.floor(minLeft)} minutes** and **${secLeft} seconds** before reusing the \`${command.name}\` command.`);
				else return message.reply(`Please wait **${timeLeft.toFixed(1)} second(s)** before reusing the \`${command.name}\` command.`);
			}
		}
		timestamps.set(id, now);
		setTimeout(() => timestamps.delete(id), cooldownAmount);
	}

	const options = { active: active };

	// execute command
	logger.log('info', `${message.author.tag} Called command: **${command.name}** ${args.join(' ')}, in guild: ${message.guild.name}`);
	try {
		command.execute(message, args, user, profile, guildProfile, client, logger, cooldowns, options);
	}
	catch (e) {
		logger.error(e.stack);
		message.reply('there was an error trying to execute that command!');
	}
});