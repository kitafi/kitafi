# Kitafi

Kitafi is a loose portmanteau between **kitabu** (book) and **tafiti** (to research or inquire). It is a free and open-source language learning tool for
Swahili that uses [spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition) to reinforce the complex syntactic structure of the language.

## JSON structure

There is a simple underlying JSON structure for organizing the language learning content.

### Build object

This is the file in [build.json](build.json).

```json
{
	"lesson": [
		"all",
		"lesson ids",
		"that should",
		"be published"
	],

	"unit": [
		"all",
		"unit ids",
		"that should",
		"be published"
	]
}
```

### Unit object

Units

```json
{
	"title": "Unit title",

	"lesson": [
		"lesson ID",
		"another lesson ID",
		"..."
	]
}
```

### Lesson object

Lessons

```json
{
	"title": "Lesson title",
	"description": "Lesson description",

	"lesson": [
		... slide objects ...
	]
}
```

### Slide object

Represents a single slide in a lesson.

To make a simple lesson slide.

```json
{
	"instruction": "Any instructions for the slide.",
	"english": "Some english phrase",
	"swahili": "It's Swahili equivalent"
}
```

To make a question slide, simply include a `__=answer__` in either the english or swahili section.

```json
{
	"english": "I have a question.",
	"swahili": "Nina __=swali__."
}
```
