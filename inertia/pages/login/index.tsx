import { Formik, FormikHelpers, FormikValues } from 'formik';
import vine from '@vinejs/vine'
import { PageLayout } from "~/components/PageLayout";
import { H1 } from "~/components/Typography/h1";

export default function Login() {
    return <PageLayout>
        <H1>Login</H1>
        <Formik initialValues={{
            email: '',
            password: ''
        }}
        validate={async (values) => {
            const formSchema = vine.compile(vine.object({}))
            const validationResult = await formSchema.tryValidate(values)
            console.log("validationResult", validationResult)
            return {}
        }}
         onSubmit={(values) => {
            console.log("Submitted ", values)
         }}>
            <form>
            <input type="text"></input>
            <input type="text"></input>
            </form>

        </Formik>
    </PageLayout>

}