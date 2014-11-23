SJS_FILES = $(wildcard *.sjs)
JS_FILES = $(patsubst %.sjs, %.js, $(SJS_FILES))
SJS_OPTS = -m sparkler/macros -m adt-simple/macros -r

all: $(JS_FILES)

%.js: %.sjs
	sjs $(SJS_OPTS) $< -o $@
	@echo $< done
