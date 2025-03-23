### Frontmatter options

- `Reset` - when this card is reached, save data is cleared
- `appearOnce` - once this card has been reached, do not show again in lists

### Choices

There are several ways to specify choices.

The first is a simple ol:

1. Choice 1. [[target-card]]
1. Choice 2. [[target-card]]
1. Choice 3. [[target-card]]

You can use ul instead if you want to use custom numbers

- 1. Choice 1. [[target-card]]
- 1. Choice 2. [[target-card]]
- 1. Choice 3. [[target-card]]

Finally, you can maybe specify them in the frontmatter? Not implemented yet

### Conditional things

==[variable] Highlighting== an item with a target at the front of it makes it conditionally render if that variable is set. ==[!variable] Exclamiation marks== negate the variable.