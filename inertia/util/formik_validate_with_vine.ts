export const validateWithVine = async (values: any, schema: any) => {
  const [errors] = await schema.tryValidate(values)

  if (!errors) {
    return {}
  } else {
    return (errors.messages as { field: string; message: string }[]).reduce((acc, v) => {
      return Object.assign(acc, {
        [v.field]: v.message,
      })
    }, {})
  }
}
