SJS_FILES = $(wildcard *.sjs)
JS_FILES = $(patsubst %.sjs, %.js, $(SJS_FILES))
SJS_OPTS = -m sparkler/macros -m adt-simple/macros -m lambda-chop/macros -m sweet-bdd  -r

all: $(JS_FILES)

%.js: %.sjs
	node_modules/.bin/sjs $(SJS_OPTS) $< -o $@
	@echo $< done

test: $(JS_FILES)
	node_modules/.bin/mocha