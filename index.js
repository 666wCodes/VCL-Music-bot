
  /*async function getLyrics(artist, title) {
    try {

	const lyricsFinder = require('lyrics-finder');
    let lyrics = await lyricsFinder(artist, title) || null;

    return lyrics
        
  } catch(error) {
      console.error(error)
      return null
  }
  }*/
  

const Discord = require('discord.js');
const { GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField } = require('discord.js');
const { Player, useQueue, useHistory } = require('discord-player');
const { BridgeProvider, BridgeSource, YouTubeExtractor } = require('@discord-player/extractor')
const db = require('quick.db');

const client = new Discord.Client({
    // Make sure you have 'GuildVoiceStates' intent enabled
    intents: [
        GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

//const bridgeProvider = new BridgeProvider(BridgeSource.SoundCloud)
// this is the entrypoint for discord-player based application
const player = new Player(client, {
blockStreamFrom: [
        // now your bot will no longer be able to use
        // youtube extractor to play audio even if the track was
        // extracted from youtube
        //YouTubeExtractor.identifier
    ],
    blockExtractors: [
        // this will block the listed extractors from being
        // able to query metadata (aka search results parsing)
        // This example disables youtube search
        YouTubeExtractor.identifier
    ]
});
//const DeezerExtractor = require("discord-player-deezer").default
//player.extractors.register(DeezerExtractor)

// Now, lets load all the default extractors, except 'YouTubeExtractor'. You can remove the filter if you want to load all the extractors.
player.extractors.loadDefault((ext) => ext !== 'attachmentextractor');
//player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor' && ext !== 'attachmentextractor');

const statusEmbed = new EmbedBuilder()
.setTitle(`Music`)
.setColor('Orange')

player.events.on('playerStart', (queue, track) => {
    // we will later define queue.metadata object while creating the queue
    let type = queue.repeatMode
    let string = "(Looping Disabled)"
    if(type === 1) string = "(Looping Song)"
    if(type === 2) string = "(Looping Queue)"
    if(type === 3) string = "(Autoplay Enabled)"
    const playEmbed = new EmbedBuilder()
	.setTitle(`Music`)
	.setColor('Orange')
    .setThumbnail(track.thumbnail)
    .setDescription(`> <:vcl:1159365015263006731> Now playing [**${track}**](${track.url})!`)
    .setTimestamp()
    .setFooter({ text: string })
    queue.metadata.channel.send({ embeds: [playEmbed]});
});

player.events.on('playerSkip', (queue, track) => {
    // Emitted when the audio player fails to load the stream for a song
    statusEmbed.setDescription(`> Skipping [**${track}**](${track.url}), failed to load song`)
    statusEmbed.setTimestamp()
    queue.metadata.channel.send({ embeds: [statusEmbed ]});
});

player.events.on('audioTracksAdd', (queue, track) => {
    // Emitted when the player adds multiple songs to its queue
    statusEmbed.setDescription(`> <:vcl:1159365015263006731> A playlist is added to the queue`)
    statusEmbed.setTimestamp()
    queue.metadata.channel.send({ embeds: [statusEmbed ]});
});

player.events.on('disconnect', (queue) => {
    // Emitted when the bot leaves the voice channel
    statusEmbed.setDescription(`> Im gonna stream my music somewhere else now, leaving`)
    statusEmbed.setTimestamp()
    queue.metadata.channel.send({ embeds: [statusEmbed ]});
});
player.events.on('emptyChannel', (queue) => {
    // Emitted when the voice channel has been empty for the set threshold
    // Bot will automatically leave the voice channel with this event
    statusEmbed.setDescription(`> Leaving because no vc activity`)
    statusEmbed.setTimestamp()
    queue.metadata.channel.send({ embeds: [statusEmbed ]});
});
player.events.on('emptyQueue', (queue) => {
    // Emitted when the player queue has finished
    statusEmbed.setDescription('> Queue ended, no more music to play')
    statusEmbed.setTimestamp()
    queue.metadata.channel.send({ embeds: [statusEmbed ]});
});

player.events.on('error', (queue, error) => {
    // Emitted when the player queue encounters error
    console.log(`General player error event: ${error.message}`);
    console.log(error);
});

player.events.on('playerError', (queue, error) => {
    // Emitted when the audio player errors while streaming audio track
    console.log(`Player error event: ${error.message}`);
    console.log(error);
});

client.on('ready', async () => {
    client.user.setPresence({
    activities: [{ name: `music | %help`, type: ActivityType.Listening }],
    status: 'dnd',
  });
    console.log('onlinr')
    console.log(`Currently in ${client.guilds.cache.size} servers`)
})

client.on('messageCreate', async (message) => {
    try {
    const interaction = message
    const member = message.member
    if(message.author.bot) return;
    if(!message.guild) return;
        //let zargs = message.content.split(" ").slice(1)
        if(!message.content.startsWith("%")) return;

    if(message.content.startsWith("%help")){

// Define the music and admin command descriptions
const musicCommands = [
    '\n**__%play__**\n> Plays a song from Spotify/SoundCloud/Apple Music',
    '**__%queue__**\n> View server\'s music queue',
    '**__%lyrics__**\n> View lyrics for the current song',
    '**__%np__**\n> View the currently playing song',
    '**__%back__**\n> Plays the previous song',
    '**__%volume__** (DJ)\n> Set music volume',
    '**__%skip__** (DJ)\n> Skip to the next song in the queue',
    '**__%stop__** (DJ)\n> Stops the music and leaves the voice channel',
    '**__%loop__**\n> Loop the current song or queue',
    '**__%autoplay__** (DJ)\n> Automatically plays songs based on your queue',
    '**__%remove__** (DJ)\n> Remove a song from the queue',
    '**__%pause__** (DJ)\n> Pause the music',
    '**__%shuffle__** (DJ)\n> Shuffle the queue'
].join('\n');

const adminCommands = [
    '\n**__%set-music-channel__**\n> Sets the music channel, which only allows music commands to be run there',
    '**__%disable-music-channel__**\n> Disables/removes the music channel',
    '**__%set-dj-role__**\n> Sets the DJ role, which gives access to unique commands and bypasses requirements (Users in the voice channel alone are automatically DJs)',
    '**__%disable-dj-role__**\n> Disables/Removes the DJ role',
    '**__%dj-only__**\n> Only allows DJs to use music commands',
    '**__%dj-role__**\n> View the current server\'s DJ role',
].join('\n');

// Create a new MessageEmbed
const helpEmbed = new EmbedBuilder()
    .setTitle('Help')
    .setDescription('Here are some available commands:')
    .addFields({ name: 'Music Commands', value: musicCommands })
    .addFields({ name: 'Admin Commands', value: adminCommands })
    .setColor('Random')
    .setFooter({ text: 'Bot coded by DaDoge924 & 666w' });

// Send the embed as a reply
return message.reply({ embeds: [helpEmbed] });
    }

    if(message.content.startsWith("%set-music-channel")){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) return message.reply(`**Missing Permissions**\n> Only server admins can use this command`)
        let args = message.content.split(" ").slice(1)
        let dj = args[1] || 'false'

        let channel = message.mentions.channels.first()
        let txt = `**Sets the music channel, which only allows music commands to be ran there**\nUsage: %set-music-channel [#channel]`
        if(!channel) return message.reply(txt)

        db.set(`m-channel-${message.guild.id}`, channel.id)
        let embed = new EmbedBuilder()
            .setTitle(`Settings have been applied`)
            .setDescription(`> **Music channel**\n<#${channel.id}>`)
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
    }

    if(message.content.startsWith("%disable-music-channel")){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) return message.reply(`**Missing Permissions**\n> Only server admins can use this command`)

        db.delete(`m-channel-${message.guild.id}`)
        let embed = new EmbedBuilder()
            .setTitle(`Settings have been applied`)
            .setDescription(`> **Music channel**\n<#${channel.id}>`)
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
    }


    if(message.content.startsWith("%set-dj-role")){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) return message.reply(`**Missing Permissions**\n> Only server admins can use this command`)
        let args = message.content.split(" ").slice(1)

        let role = message.mentions.roles.first()
        let txt = `**Sets the DJ role, which gives access to unique commands and skips requirements for users with the role without needing admin permissions (Users in the vc alone are automatically DJs)**\nUsage: %set-dj-role [@role]`
        if(!role) return message.reply(txt)

        db.set(`dj-role-${message.guild.id}`, role.id)
        let embed = new EmbedBuilder()
            .setTitle(`Settings have been applied`)
            .setDescription(`> **DJ role**\n<@&${role.id}>`)
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
    }

    if(message.content.startsWith("%disable-dj-role")){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) return message.reply(`**Missing Permissions**\n> Only server admins can use this command`)
        db.delete(`dj-role-${message.guild.id}`)
        let embed = new EmbedBuilder()
            .setTitle(`Settings have been applied`)
            .setDescription(`> **DJ role**\nDisabled`)
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
    }

    if(message.content.startsWith("%dj-only")){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) return message.reply(`**Missing Permissions**\n> Only server admins can use this command`)
        let args = message.content.split(" ").slice(1)
        let dj = args[1] || 'false'

        let channel = message.mentions.channels.first()
        let txt = `**Only allows users with DJ role to use music commands**\nUsage: %dj-only [true/false]`
        if(!channel) return message.reply(txt)
        if(dj.toLowerCase() === 'true'){
            db.set(`dj-only-${message.guild.id}`, 'true')
        let embed = new EmbedBuilder()
            .setTitle(`Settings have been applied`)
            .setDescription(`> **Music commands limited to DJs only**\nEnabled`)
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
        } else {
            db.set(`dj-only-${message.guild.id}`, 'false')
            let embed = new EmbedBuilder()
                .setTitle(`Settings have been applied`)
                .setDescription(`> **Music commands limited to DJs only**\nDisabled`)
                .setColor('Random')
                .setTimestamp()
    
                return message.reply({ embeds: [embed] }) 
        }
    }

    if(message.content.startsWith("%dj-role")){

            let djrole = db.get(`dj-role-${message.guild.id}`)
            let role = message.guild.roles.cache.get(djrole || '0') || null
            if(!role) return message.reply(`> A DJ role is not set on this server, what\'s a DJ? View more info in %set-dj-role`)
            let embed = new EmbedBuilder()
            .setTitle(`DJ Role`)
            .setDescription(`> Currently set to <@&${role.id}>`)
            .setFooter({ text: 'Change this with %set-dj-role' })
            .setColor('Random')
            .setTimestamp()

            return message.reply({ embeds: [embed] })
    }
    

    let djRoleId = db.get(`dj-role-${message.guild.id}`)
    let djRole = message.guild.roles.cache.get(djRoleId || '0') || null

    let djOnly = db.get(`dj-only-${message.guild.id}`) || 'false'

    let mChannelId = db.get(`m-channel-${message.guild.id}`)
    let mChannel = message.guild.channels.cache.get(mChannelId || '0')
    //console.log(mChannel)

    if(djOnly === 'true'){
        if(djRole){
            if(!member.roles.cache.has(djRole.id)){
                return message.reply(`> Music commands are only enabled to DJs, please get the DJ role to play music. (disable this with %dj-only false)`)
            }
        }
    }

    if(mChannel){
        if(message.channel.id !== mChannel.id && !interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)){
            return message.reply(`> Music commands can only be run in <#${mChannel.id}> (disable this with %disable-music-channel)`)
        }
    }

    let userDj = false
    if(djRole){
        if(member.roles.cache.has(djRole.id)){
            userDj = true
        }
    }

    if(member.voice.channel){
        if(member.voice.channel.members.size === 1){
            userDj = true
        }
    }

    if(interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)){
        userDj = true
    }

    if(!djRole){
        userDj = true
    }

    //console.log(userDj)


    


// music commands

if(message.content.startsWith("%play")){
    const queue = useQueue(interaction.guild.id)
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
    const query = message.content.split(" ").slice(1).join(" ")
    if(!query) return message.reply(`Please enter a spotify/soundcloud/apple music query/song url`)
    let msg = message.reply(`🔎 Searching... please wait`)
    try{
    let scount = queue.tracks.toArray().length || 0
    //if(scount === 25 || scount > 25) return message.reply(`The queue is full! (25 songs)`)
    } catch { console.log('empty') }
    let tri = false
    
    try{
    let tri = queue.isTransitioning()
    } catch {
        let tri = false
    }


    if(tri === true) return message.reply(`Please wait! The bot is buffering the next song, try again in a few seconds`)


    try {
        const { track } = await player.play(channel, query, {
            nodeOptions: {
                // nodeOptions are the options for guild node (aka your queue in simple word)
                metadata: message // we can access this metadata object using queue.metadata later on
            }
        });
        //let footer = `[${track.duration}]`
        const embed = new EmbedBuilder()
        .setTitle(`Track added`)
        .setDescription(`> Added [**${track}**](${track.url}) to the queue!`)
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `[${track.duration}]`})
        return message.reply({ embeds: [embed] });
    } catch (e) {
        // let's return error if something failed
        console.log(e)
        return message.reply(`Could not find a song with query **${query}**!`);
    }
}
if (message.content.startsWith("%queue")) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You are not connected to a voice channel!');
    const queue = useQueue(message.guild.id);
    try {
        let ispaused = queue.node.isPaused()
        if(ispaused === true){
            ispaused = "(Paused)"
        } else {
            ispaused = "(Playing)"
        }
        
      const tracks = queue.tracks.toArray(); // Converts the queue into an array of tracks
      const currentTrack = queue.currentTrack;
      let qq = [];
  
      for (let i = 0; i < tracks.length; i++) {
        qq.push(`**${i + 1} | ${tracks[i].title} - ${tracks[i].author} [${tracks[i].duration}]**`);
      }
  
      // Define the page size (e.g., 15 tracks per page)
      const pageSize = 15;
  
      // Get the requested page number from the message content
      const args = message.content.split(' ');
      const requestedPage = parseInt(args[1]) || 1; // Default to page 1 if no page number is specified
  
      // Calculate the start and end indices for the requested page
      const startIndex = (requestedPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
  
      // Extract the tracks for the requested page
      const tracksForPage = qq.slice(startIndex, endIndex);
  
      // Check if there are more tracks beyond the current page
      if (qq.length > endIndex) {
        // Suggest to go to the next page
        tracksForPage.push(`\n*To see the next page of tracks, use %queue ${requestedPage + 1}*`);
      }
  
      // Display the current track and the tracks for the requested page
      const embed = new EmbedBuilder()
        .setDescription(`**Now Playing**\n${currentTrack.title} by ${currentTrack.author} [${currentTrack.duration}] ${ispaused}\n\n**Queue [${queue.tracks.toArray().length || 0}] - Page ${requestedPage}**\n${tracksForPage.join("\n") || 'Nothing in queue.'}`)
        .setColor('Random')
      message.reply({ embeds: [embed] });
      //console.log(currentTrack);
    } catch {
      message.reply(`The queue is empty and no one is playing music, start the party with %play!`);
    }
  }
  
  
if (message.content.startsWith("%lyrics")) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You are not connected to a voice channel!');
    const queue = useQueue(message.guild.id);
    if(queue.isPlaying() === false) return message.reply(`No song is currently playing!`)
    const currentTrack = queue.currentTrack;
    
    const { lyricsExtractor } = require('@discord-player/extractor');

const lyricsFinder = lyricsExtractor();

const lyrics = await lyricsFinder.search(currentTrack.title).catch(() => null);
    console.log(lyrics)
    if (!lyrics || lyrics === null) return message.reply({ content: 'No lyrics found for the current song' });
  
    // Define the page size (e.g., 2000 characters per page)
    const pageSize = 1500;
  
    // Get the requested page number from the message content
    const args = message.content.split(' ');
    const requestedPage = parseInt(args[1]) || 1; // Default to page 1 if no page number is specified
  
    // Calculate the start and end indices for the requested page
    const startIndex = (requestedPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
  
    // Extract the lyrics for the requested page
    let trimmedLyrics = lyrics.lyrics.substring(startIndex, endIndex);
  
    // Check if there are more lyrics beyond the current page
    if (lyrics.lyrics.length > endIndex) {
      trimmedLyrics += `\n\n*To see the next page of lyrics, use %lyrics ${requestedPage + 1}*`;
    }
    const embed = new EmbedBuilder()
    .setDescription(trimmedLyrics)
    .setColor('Random')
    .setTitle(`__**${queue.currentTrack.title} by ${queue.currentTrack.author}**__`)
    message.reply({ embeds: [embed] });
  }
  
  

if(message.content.startsWith("%skip")){
const channel = interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator);
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
    if(userDj === true){
const queue = useQueue(interaction.guild.id);
const currentTrack = queue.currentTrack
if(currentTrack){
        queue.node.skip()
message.reply(`Skipped to next song in queue!`)
} else {
    message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
}

} else {
    message.reply(`No song is currently playing! Can\'t skip`)
}
} catch {
    message.reply(`No song is currently playing! Can\'t skip`)
}
}

if(message.content.startsWith("%volume")){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
if(userDj === true){
    const queue = useQueue(interaction.guild.id);
    let args = message.content.split(" ").slice(1)
    let volume = Number(args[0])
    //console.log(args[0])

    if(volume < 0 || volume > 100) return message.reply(`Invalid volume percentage, do !volume 0-1000000`)
queue.node.setVolume(volume)
message.reply(`Volume has been set to ${volume}%`)
} else {
    message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
}
}

if(message.content.startsWith("%stop")){
    try{
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
if(userDj === true){
const queue = useQueue(interaction.guild.id);
queue.delete();

message.reply(`Stopped the music`)
} else {
    message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
}
    } catch {
        message.reply('No song is currently playing! Can\'t Stop')
    }
}

if(message.content === "%loop-disable" || message.content === "%loopdisable"){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
    const queue = useQueue(interaction.guild.id);
    let type = queue.repeatMode

    if(type === 0) return message.reply(`Looping is already disabled`)
    queue.setRepeatMode(0)
    message.reply('Disabled loop!')



} catch(err) {
    console.log(err)
    message.reply('No song is currently playing! Can\'t loop')
}
}

if(message.content === "%loop-song" || message.content === "%loopsong"){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
    const queue = useQueue(interaction.guild.id);
    let type = queue.repeatMode
	
    if(type === 1) return message.reply(`Song is currently looped! Disable it with %loop-disable`)
    if(type === 3) return message.reply(`Can\'t loop while autoplay is enabled! Disable it with %autoplay-disable`)
    queue.setRepeatMode(1)
    message.reply('Looped Song!')



} catch(err) {
    console.log(err)
    message.reply('No song is currently playing! Can\'t loop')
}
}


if(message.content === "%loop-queue" || message.content === "%loopqueue"){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
        const queue = useQueue(interaction.guild.id);
    let type = queue.repeatMode
	
    if(type === 2) return message.reply(`Queue is currently looped! Disable it with %loop-disable`)
    if(type === 3) return message.reply(`Can\'t loop while autoplay is enabled! Disable it with %autoplay-disable`)
    queue.setRepeatMode(2)
    message.reply('Looped Queue!')



} catch {
    message.reply('No song is currently playing! Can\'t loop')
}
}
        
        if(message.content === "%autoplay" || message.content === "%auto-play"){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
    if(userDj === true){
        const queue = useQueue(interaction.guild.id);
    let type = queue.repeatMode
    if(type === 3) return message.reply(`Autoplay is already enabled! Disable it with %autoplay-disable`)
    if(type !== 0) return message.reply(`Can\'t enable autoplay while the song/queue is being looped!`)
    queue.setRepeatMode(3)
    message.reply('Autoplay enabled')
        } else {
            message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
        }

} catch {
    message.reply('No song is currently playing! Can\'t loop')
}
}
        
         if(message.content === "%autoplaydisable" || message.content === "%autoplay-disable"){
    const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
    if(userDj === true){
        const queue = useQueue(interaction.guild.id);
    let type = queue.repeatMode
    if(type !== 3) return message.reply(`Autoplay is already disabled`)
    queue.setRepeatMode(0)
    message.reply('Autoplay disabled')
        } else {
            message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
        }

} catch {
    message.reply('No song is currently playing! Can\'t loop')
}
}
        
 

if(message.content === '%loop'){
    message.reply(`Loop types: \`%loop-queue\`, \`%loop-song\` and \`%loop-disable\``)
}

if(message.content.startsWith("%np") || message.content.startsWith("!nowplaying")){
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You are not connected to a voice channel!');
    const queue = useQueue(message.guild.id);
    try{
        let ispaused = queue.node.isPaused()
        if(ispaused === true){
            ispaused = "(Paused)"
        } else {
            ispaused = "(Playing)"
        }
    const currentTrack = queue.currentTrack

    const embed = new EmbedBuilder()
    .setDescription(`${currentTrack.title} by ${currentTrack.author} [${currentTrack.duration}]`)
    .setTitle(`Now Playing`)
    .setColor('Random')
    .setFooter({ text: ispaused })
    
        message.reply({ embeds: [embed] })
    
    } catch {
        message.reply(`Nothing is playing`)
    }
    }

if(message.content.startsWith("%remove")){
    const queue = useQueue(interaction.guild.id);
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You are not connected to a voice channel!');
    if(userDj === true){
    let args = message.content.split(" ").slice(1)
    let num = Number(args[0])
    if(0 > num) return message.reply(`Invalid song index`)
    let str = num - 1
    let count = queue.tracks.toArray().length || 0
    if(num > count) return message.reply(`A song is not in queue at #${num}`)
queue.removeTrack(str)
message.reply(`Removed song **#${num}** from the queue`)
    } else {
        message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
    }
}
        
if(message.content.startsWith("%back")){
const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
const queue = useQueue(interaction.guild.id);
const currentTrack = queue.currentTrack

const history = useHistory(interaction.guild.id);
    
    message.reply(`🔃 Buffering... please wait`)
    
    if(currentTrack){
        await history.previous();
        return message.reply(`Went back to previous track!`)
    } else {
        message.reply(`Can\'t play previous song! Only works if you are playing a song, played a song before this one and not looping the music/queue`)
    }
} catch {
    message.reply(`Can\'t play previous song! Only works if you are playing a song, played a song before this one and not looping the music/queue`)
}
}
        
if(message.content.startsWith("%shuffle")){
const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
const queue = useQueue(interaction.guild.id);
const currentTrack = queue.currentTrack

    
    if(currentTrack){
        if(userDj === true){
        await queue.tracks.shuffle();
        return message.reply(`Shuffled the queue!`)
        } else {
            message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
        }
    } else {
        message.reply(`No song is currently playing! Can\'t shuffle`)
    }
} catch {
    message.reply(`No song is currently playing! Can\'t shuffle`)
}
}
        
       if(message.content.startsWith("%pause")){
const channel = message.member.voice.channel;
if (!channel) return message.reply('You are not connected to a voice channel!');
try{
const queue = useQueue(interaction.guild.id);
const currentTrack = queue.currentTrack

    
    if(currentTrack){
        let paused = queue.node.isPaused()
        if(userDj === true){
        if(paused === false){
            queue.node.setPaused(true)
            return message.reply(`Music has been paused!`)
        } else {
            queue.node.setPaused(false)
            return message.reply(`Music has been unpaused!`)
        }
    } else {
        message.reply(`The DJ system is enabled in this server, you do not have the DJ role or are not alone in this VC and cannot perform this action. More info in %dj-role`)
    }
    } else {
        message.reply(`No song is currently playing! Can\'t pause`)
    }
} catch {
    message.reply(`No song is currently playing! Can\'t pause`)
}
}

/*
if(message.content === "%fav" || message.content === "%favourite"){
    const queue = useQueue(interaction.guild.id)
    if(queue.isPlaying() === false) return message.reply(`No song is currently playing!`)

    let song = queue.currentTrack

    let fav = db.get(`fav-${message.author.id}`)
    if(fav === null){
        let array = []
        array.push({ song: `${song.title} by ${song.author}`, title: song.title, author: song.author, url: song.url, thumbnail: song.thumbnail})
        db.set(`fav-${message.author.id}`, array)
    } else {
        db.push(`fav-${message.author.id}`, { song: `${song.title} by ${song.author}`, title: song.title, author: song.author, url: song.url, thumbnail: song.thumbnail})
    }

    message.reply(`${song.title} by ${song.author} added to your %favourites`)

}*/

} catch(err) {
    console.error(err)
    message.reply(`> An error occured while processing your request`)
}

})

client.login(process.env.TOKEN)