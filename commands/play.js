const ytdl = require('ytdl-core-discord');
const YouTube = require('discord-youtube-api');
const ytAPI = process.env.YT_API;
const Discord = require('discord.js');

module.exports = {
	name: 'play',
	summary: 'Play a song',
	description: 'Play a song, supports youtube videos.',
	category: 'music',
	aliases: ['song'],
	args: true,
	usage: '<search criteria>',


	async execute(message, args, msgUser, profile, guildProfile, client, logger, cooldowns, options) {

		if (!message.member.voice.channel) return message.reply('you are not in a voice channel.');

		const youtube = new YouTube(ytAPI);
		const search = args.join(' ');
		let video;
		const data = options.active.get(message.guild.id) || {};

		try {
			if (!data.connection) data.connection = await message.member.voice.channel.join();
			else if (data.connection.status == 4) {
				data.connection = await message.member.voice.channel.join();
				const guildIDData = options.active.get(message.guild.id);
				guildIDData.dispatcher.emit('finish');
			}
		}
		catch (error) {
			logger.warn('Neia couldnt join the voice channel');
			return message.reply('Neia probably does not have permission to join the channel or something else went wrong');
		}


		if (!data.queue) data.queue = [];
		if (data.queue.length >= 4) return message.reply('you have reached the maximum queue size for free users.\nIf you want to upgrade your queue size contact OverlordOE#0717.');
		data.guildID = message.guild.id;

		try {
			if (await ytdl.validateURL(search)) video = await youtube.getVideo(search);
			else video = await youtube.searchVideos(search);

			data.queue.push({
				songTitle: video.title,
				requester: message.author,
				url: video.url,
				announceChannel: message.channel.id,
				duration: video.length,
			});

		} catch (error) {
			if (data.queue.length < 1) data.dispatcher.emit('finish');
			logger.warn(`Could not find youtube video with search terms ${search}`);
			return message.reply(`Neia could not find any video connected to the search terms of \`${search}\``);
		}
		const embed = new Discord.MessageEmbed()
			.setThumbnail(message.author.displayAvatarURL())
			.setColor(msgUser.pColour);


		if (!data.dispatcher) Play(client, options, data, logger, msgUser, message);
		else message.channel.send(embed.setDescription(`Added **${video.title}** to the queue.\n\nRequested by ${message.author}`));

		options.active.set(message.guild.id, data);
	},
};


async function Play(client, options, data, logger, msgUser, message) {

	const channel = client.channels.cache.get(data.queue[0].announceChannel);
	const embed = new Discord.MessageEmbed()
		.setThumbnail(data.queue[0].requester.displayAvatarURL())
		.setColor(msgUser.pColour);

	channel.send(embed.setDescription(`Now playing **${data.queue[0].songTitle}**\nRequested by ${data.queue[0].requester}`));

	data.dispatcher = data.connection.play(await ytdl(data.queue[0].url, {
		filter: 'audioonly',
		highWaterMark: 1 << 25,
	}), { type: 'opus' });
	data.dispatcher.guildID = data.guildID;


	data.dispatcher.on('finish', () => Finish(client, options, data.dispatcher, logger, msgUser, message));
	data.dispatcher.on('error', e => {
		channel.send(embed.setDescription(`error:  ${e.info}`));
		logger.error(e.stack);
	});
	data.dispatcher.on('failed', e => {
		channel.send(embed.setDescription('error:  failed to join voice channel'));
		logger.log('error', `failed to join voice channel for reason: ${e.info}`);
	});
	data.dispatcher.on('disconnect', e => {
		data.dispatcher = null;
		logger.log('info', `left voice channel for reason: ${e.info}`);
	});
}


function Finish(client, options, dispatcher, logger, msgUser, message) {

	const fetchedData = options.active.get(dispatcher.guildID);
	if (fetchedData.loop) {
		options.active.set(dispatcher.guildID, fetchedData);
		return Play(client, options, fetchedData, logger, msgUser, message);
	}
	else fetchedData.queue.shift();

	if (fetchedData.queue.length > 0) {
		options.active.set(dispatcher.guildID, fetchedData);
		Play(client, options, fetchedData, logger, msgUser, message);
	}

	else {
		options.active.delete(dispatcher.guildID);
		const voiceChannel = client.guilds.cache.get(dispatcher.guildID).me.voice.channel;
		if (voiceChannel) voiceChannel.leave();
	}
}
