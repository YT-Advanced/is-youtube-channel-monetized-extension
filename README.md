# is-youtube-channel-monetized-extension

Shows whether a YouTube channel or its videos are monetized or not, and provides details on their monetization status.
This extension show if a channel is monetized with 90% accuracy! 

# How it worked:
YouTube removed the display of monetization status in the channel page code on November 17, 2023, meaning that “is_monetization_enabled” no longer appears in the channel source. So we did some other way to check:
1. Check if there is a join button on the channel,
2. Check if number of subscibers is more than 1000
3. Take 3 random video which is longer than 4 minutes, check if there is ads in these video
