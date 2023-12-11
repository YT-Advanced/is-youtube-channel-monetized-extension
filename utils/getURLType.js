const getURLType = (url) => {
	if (url.includes("/channel/")) return "channel";
	if (url.includes("/c/")) return "channel";
	if (url.includes("/user/")) return "channel";
	if (url.includes("youtube.com/@")) return "channel";
	return null;
};
