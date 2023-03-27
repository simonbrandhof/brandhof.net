const { EleventyI18nPlugin } = require("@11ty/eleventy");
const {JSDOM} = require("jsdom");
const htmlmin = require('html-minifier');
const pluginImage = require('@11ty/eleventy-img');
const markdownIt = require("markdown-it");
const path = require("path");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(EleventyI18nPlugin, {defaultLanguage: "en"});
  eleventyConfig.setTemplateFormats(["html", "md", "njk"]);
  eleventyConfig.addPassthroughCopy("src/.htaccess");
  eleventyConfig.addPassthroughCopy("src/admin/config.yml");
  eleventyConfig.addPassthroughCopy("src/img/");
  eleventyConfig.addPassthroughCopy("src/media/");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addWatchTarget("./tailwind.config.js");
	eleventyConfig.addFilter("md", function (content = "") {
		return markdownIt({ html: true }).render(content);
	});
  eleventyConfig.addTransform('optimizeImages', optimizeImagesTransform);
  if (process.env.ELEVENTY_PRODUCTION) {
    eleventyConfig.addTransform('minimizeHtml', htmlminTransform);
  }

  return {
		dir: {
			input: "src"
		},
		markdownTemplateEngine: "njk",
		htmlTemplateEngine: "njk"
	}
};

function htmlminTransform(content) {
  if (this.page.outputPath && this.page.outputPath.endsWith('.html')) {
    return htmlmin.minify(content, {
      useShortDoctype: true,
      removeComments: true,
      collapseWhitespace: true,
      removeEmptyAttributes: true
    });
  }
  return content;
}

async function optimizeImagesTransform(content) {
  if (this.page.outputPath && this.page.outputPath.endsWith('.html')) {
    const dom = new JSDOM(content);
    const images = [...dom.window.document.querySelectorAll("img")];
    if (images.length > 0) {
      await Promise.all(images.map((i) => optimizeImage(i)));
      content = dom.serialize();
    }
  }
  return content;
}

async function optimizeImage(imgDom) {
  let src = imgDom.getAttribute("src");
  if (!src.startsWith("/")) {
    return;
  }
  // src = "/img/foo.jpg"
  // --> sourcePath = ./src/img/foo.jpg
  // --> outputDir = ./_site/img/
  // --> urlPath = /img/
  let sourcePath = path.resolve("./src", "." + src);
  let outputDir = path.resolve("./_site", "." + src, "../");
  let urlPath = src.split('/').slice(0, -1).join('/') + '/';

  let widths = [300, 600, 1000, "auto"];
  //  "avif" vs "webp" is a long debate. Anyway I don't think it's useful to make a longer build just for supporting 
  //  both of them.
  let metadata = await pluginImage(sourcePath, {
    widths: widths || ["auto"],
    formats: ["jpeg", "webp", "auto"],
    outputDir: outputDir,
    urlPath: urlPath,
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);
      return `${name}-w${width}.${format}`;
    },
  });

  const firstMetadataObj = metadata[Object.keys(metadata)[0]];
  if (firstMetadataObj.length === 0) {
    return;
  }
  const largestImage = firstMetadataObj.reduce((acc, curr) => {
    return curr.width > acc.width ? curr : acc;
  }, firstMetadataObj[0]);

  const imageAttributes = {
    sizes: `(max-width: ${largestImage.width}px) 100vw, ${largestImage.width}px`,
    alt: imgDom.getAttribute("alt") ?? "",
    loading: imgDom.getAttribute("loading") ?? 'lazy',
    decoding: 'async',
    class: imgDom.getAttribute("class") ?? '',
  };

  imgDom.outerHTML = pluginImage.generateHTML(metadata, imageAttributes);
  // TODO insert <figcaption>, based on the "title" attribute of <img>
}
